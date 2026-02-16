"""Extract symptoms from a user query and collect paragraphs mentioning them.

Writes incrementing files into `test_out/`:
- `symptomonly{n}.json`: {"query": str, "symptoms": [ ... ]}
- `symptomandanalysis{n}.json`: {"query": str, "analysis": { symptom: [{file, paragraph, dosha_score}, ...] }}

Also writes `symptom_texts.json` (legacy) for quick inspection.

Usage:
  python extract_symptoms_and_texts.py --query "I have knee pain and swelling"
  or run without args to be prompted.
"""

import argparse
import json
import os
from typing import List, Dict


# try to reuse local extraction and nlp where available
try:
	from extraction.text import clean_text, paragraph_chunks
except Exception:
	clean_text = None
	paragraph_chunks = None

try:
	from nlp.dosha_scoring import score_sentence, symptoms_to_dosha
except Exception:
	score_sentence = None
	symptoms_to_dosha = None


BASE = os.path.dirname(__file__)
TEST_OUT = os.path.join(BASE, 'test_out')
os.makedirs(TEST_OUT, exist_ok=True)


def safe_read(path: str) -> str:
	try:
		with open(path, 'r', encoding='utf-8') as f:
			return f.read()
	except Exception:
		try:
			with open(path, 'r', encoding='latin-1') as f:
				return f.read()
		except Exception:
			return ''


def find_paragraphs_with_keyword(root: str, keyword: str) -> List[Dict]:
	out = []
	kw = keyword.casefold()
	for dirpath, dirnames, filenames in os.walk(root):
		# skip virtualenvs and caches
		if 'venv' in dirpath.lower() or '__pycache__' in dirpath:
			continue
		for fn in filenames:
			if not fn.lower().endswith(('.txt', '.md', '.jsonl', '.json')):
				continue
			fp = os.path.join(dirpath, fn)
			rel = os.path.relpath(fp, BASE)
			txt = safe_read(fp)
			if not txt:
				continue
			# split into paragraphs using extraction.clean_text + paragraph_chunks if available,
			# otherwise fallback to double-newline
			if clean_text and paragraph_chunks:
				try:
					cleaned = clean_text(txt)
					paras = paragraph_chunks(cleaned)
				except Exception:
					paras = [{'text': p.strip()} for p in txt.split('\n\n') if p.strip()]
				for p in paras:
					if kw in p.get('text', '').casefold():
						rec = {'file': rel.replace('\\', '/'), 'paragraph': p.get('text'), 'char_start': p.get('char_start'), 'char_end': p.get('char_end')}
						out.append(rec)
			else:
				paras = [p.strip() for p in txt.split('\n\n') if p.strip()]
				for p in paras:
					if kw in p.casefold():
						out.append({'file': rel.replace('\\', '/'), 'paragraph': p})
	return out


def main():
	parser = argparse.ArgumentParser()
	parser.add_argument('--query', '-q', help='User query text (optional)')
	args = parser.parse_args()

	if args.query:
		query = args.query.strip()
	else:
		query = input('Enter user symptom query:\n> ').strip()
	if not query:
		print('No query provided; exiting.')
		return

	# Import detector from run_cross_query if available
	try:
		from run_cross_query import detect_symptoms_from_text
	except Exception:
		# fallback: very small heuristic similar to run_cross_query
		def detect_symptoms_from_text(text: str):
			parts = []
			for sep in [',', ';', ' and ', ' & ']:
				text = text.replace(sep, '|')
			for p in text.split('|'):
				tok = p.strip()
				if tok:
					parts.append({'text': tok, 'body_part': None, 'symptom': None, 'composite': None, 'canonical_id': None})
			return parts

	detected = detect_symptoms_from_text(query)

	# Build symptom list (use composite if present else text)
	symptom_keys = []
	for d in detected:
		key = d.get('composite') or d.get('symptom') or d.get('text')
		if key:
			symptom_keys.append(key)
	# dedupe while preserving order
	seen = set()
	symptom_keys = [s for s in symptom_keys if not (s in seen or seen.add(s))]

	# If no symptoms detected, do not write any files
	if not symptom_keys:
		print('No symptoms detected; no files written.')
		return

	# For each symptom, search repo files (including test_out) for paragraphs
	texts_for = {}
	search_root = BASE  # search within bot-brain
	for s in symptom_keys:
		texts_for[s] = find_paragraphs_with_keyword(search_root, s)

	# Also search the user's merged book (if present) and include paragraphs from it
	merged_path = r"C:\Users\aarri\Downloads\Ayurvedic_merged.txt"
	if os.path.exists(merged_path):
		merged_text = safe_read(merged_path)
		if merged_text:
			# prefer using extraction clean + paragraph_chunks for better paragraphs
			if clean_text and paragraph_chunks:
				try:
					cleaned = clean_text(merged_text)
					paras = paragraph_chunks(cleaned)
					paras_list = [p.get('text') for p in paras]
				except Exception:
					paras_list = [p.strip() for p in merged_text.split('\n\n') if p.strip()]
			else:
				paras_list = [p.strip() for p in merged_text.split('\n\n') if p.strip()]

			for s in symptom_keys:
				for p in paras_list:
					if s.casefold() in p.casefold():
						texts_for.setdefault(s, []).append({'file': os.path.relpath(merged_path, BASE).replace('\\', '/'), 'paragraph': p})

	# If dosha scoring is available, compute analysis per paragraph and per symptom aggregate
	analysis_for = {}
	if score_sentence or symptoms_to_dosha:
		for s, items in texts_for.items():
			analysis_for[s] = []
			for it in items:
				para_text = it.get('paragraph', '')
				para_score = None
				if score_sentence:
					try:
						para_score = score_sentence(para_text)
					except Exception:
						para_score = None
				analysis_for[s].append({'file': it.get('file'), 'paragraph': para_text, 'dosha_score': para_score})
	else:
		# mirror texts_for structure if no analysis
		analysis_for = {s: [{'file': it.get('file'), 'paragraph': it.get('paragraph')} for it in items] for s, items in texts_for.items()}

	# Determine next index for incremental filenames
	existing = [fn for fn in os.listdir(TEST_OUT) if fn.startswith('symptomonly') and fn.endswith('.json')]
	max_idx = 0
	for fn in existing:
		try:
			num = int(''.join(ch for ch in fn if ch.isdigit()))
			if num > max_idx:
				max_idx = num
		except Exception:
			continue
	next_idx = max_idx + 1

	symptomonly_name = os.path.join(TEST_OUT, f'symptomonly{next_idx}.json')
	symptomand_name = os.path.join(TEST_OUT, f'symptomandanalysis{next_idx}.json')

	# symptomonly: just the detected symptom keys
	with open(symptomonly_name, 'w', encoding='utf-8') as f:
		json.dump({'query': query, 'symptoms': symptom_keys}, f, indent=2, ensure_ascii=False)

	# symptomandanalysis: include texts and analysis
	with open(symptomand_name, 'w', encoding='utf-8') as f:
		json.dump({'query': query, 'analysis': analysis_for}, f, indent=2, ensure_ascii=False)

	# legacy paths for backward compatibility
	outpath1 = os.path.join(TEST_OUT, 'symptom_texts.json')
	with open(outpath1, 'w', encoding='utf-8') as f:
		json.dump(texts_for, f, indent=2, ensure_ascii=False)

	# Write symptomqn.json last so it's present only when symptoms exist
	qpath = os.path.join(TEST_OUT, 'symptomqn.json')
	with open(qpath, 'w', encoding='utf-8') as f:
		json.dump({'query': query, 'detected': detected}, f, indent=2, ensure_ascii=False)

	print('Wrote:', qpath)
	print('Wrote:', symptomonly_name)
	print('Wrote:', symptomand_name)
	print('Wrote (legacy):', outpath1)


def extract_and_save(query: str, detect_fn=None) -> Dict[str, str]:
	"""Extract symptoms and save outputs to `test_out`.

	detect_fn: optional function to detect symptoms from text. If None, the module
	will try to import `run_cross_query.detect_symptoms_from_text` as fallback.

	Returns a dict with written file paths.
	"""
	# reuse logic from main but allow external detector to avoid circular imports
	if detect_fn is None:
		try:
			from run_cross_query import detect_symptoms_from_text as detect_fn
		except Exception:
			# fallback heuristic
			def detect_fn(text: str):
				parts = []
				for sep in [',', ';', ' and ', ' & ']:
					text = text.replace(sep, '|')
				for p in text.split('|'):
					tok = p.strip()
					if tok:
						parts.append({'text': tok, 'body_part': None, 'symptom': None, 'composite': None, 'canonical_id': None})
				return parts

	detected = detect_fn(query)

	# Build symptom list (use composite if present else text)
	symptom_keys = []
	for d in detected:
		key = d.get('composite') or d.get('symptom') or d.get('text')
		if key:
			symptom_keys.append(key)
	# dedupe while preserving order
	seen = set()
	symptom_keys = [s for s in symptom_keys if not (s in seen or seen.add(s))]

	# If no symptoms detected, do not write any files
	if not symptom_keys:
		return {}
	# dedupe while preserving order
	seen = set()
	symptom_keys = [s for s in symptom_keys if not (s in seen or seen.add(s))]

	# For each symptom, search repo files (including test_out) for paragraphs
	texts_for = {}
	search_root = BASE  # search within bot-brain
	for s in symptom_keys:
		texts_for[s] = find_paragraphs_with_keyword(search_root, s)

	# Also search the user's merged book (if present) and include paragraphs from it
	merged_path = r"C:\Users\aarri\Downloads\Ayurvedic_merged.txt"
	if os.path.exists(merged_path):
		merged_text = safe_read(merged_path)
		if merged_text:
			# prefer using extraction clean + paragraph_chunks for better paragraphs
			if clean_text and paragraph_chunks:
				try:
					cleaned = clean_text(merged_text)
					paras = paragraph_chunks(cleaned)
					paras_list = [p.get('text') for p in paras]
				except Exception:
					paras_list = [p.strip() for p in merged_text.split('\n\n') if p.strip()]
			else:
				paras_list = [p.strip() for p in merged_text.split('\n\n') if p.strip()]

			for s in symptom_keys:
				for p in paras_list:
					if s.casefold() in p.casefold():
						texts_for.setdefault(s, []).append({'file': os.path.relpath(merged_path, BASE).replace('\\', '/'), 'paragraph': p})

	# If dosha scoring is available, compute analysis per paragraph and per symptom aggregate
	analysis_for = {}
	if score_sentence or symptoms_to_dosha:
		for s, items in texts_for.items():
			analysis_for[s] = []
			for it in items:
				para_text = it.get('paragraph', '')
				para_score = None
				if score_sentence:
					try:
						para_score = score_sentence(para_text)
					except Exception:
						para_score = None
				analysis_for[s].append({'file': it.get('file'), 'paragraph': para_text, 'dosha_score': para_score})
	else:
		# mirror texts_for structure if no analysis
		analysis_for = {s: [{'file': it.get('file'), 'paragraph': it.get('paragraph')} for it in items] for s, items in texts_for.items()}

	# Determine next index for incremental filenames
	existing = [fn for fn in os.listdir(TEST_OUT) if fn.startswith('symptomonly') and fn.endswith('.json')]
	max_idx = 0
	for fn in existing:
		try:
			num = int(''.join(ch for ch in fn if ch.isdigit()))
			if num > max_idx:
				max_idx = num
		except Exception:
			continue
	next_idx = max_idx + 1

	symptomonly_name = os.path.join(TEST_OUT, f'symptomonly{next_idx}.json')
	symptomand_name = os.path.join(TEST_OUT, f'symptomandanalysis{next_idx}.json')

	# symptomonly: just the detected symptom keys
	with open(symptomonly_name, 'w', encoding='utf-8') as f:
		json.dump({'query': query, 'symptoms': symptom_keys}, f, indent=2, ensure_ascii=False)

	# symptomandanalysis: include texts and analysis
	with open(symptomand_name, 'w', encoding='utf-8') as f:
		json.dump({'query': query, 'analysis': analysis_for}, f, indent=2, ensure_ascii=False)

	# legacy paths for backward compatibility
	outpath1 = os.path.join(TEST_OUT, 'symptom_texts.json')
	with open(outpath1, 'w', encoding='utf-8') as f:
		json.dump(texts_for, f, indent=2, ensure_ascii=False)

	# Write symptomqn.json last so it's present only when symptoms exist
	qpath = os.path.join(TEST_OUT, 'symptomqn.json')
	with open(qpath, 'w', encoding='utf-8') as f:
		json.dump({'query': query, 'detected': detected}, f, indent=2, ensure_ascii=False)

	return {
		'symptomqn': qpath,
		'symptomonly': symptomonly_name,
		'symptomandanalysis': symptomand_name,
		'legacy': outpath1,
	}


if __name__ == '__main__':
	main()
