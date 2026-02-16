"""Knowledge Base Aggregator.

Aggregates KB JSONL into canonical-centric JSON format.
"""
from pathlib import Path
from storage import aggregate, save_json, CANONICAL_REGISTRY


def main():
    base = Path(__file__).resolve().parent
    kb = base / 'test_out' / 'sample_kb.jsonl'
    outp = base / 'test_out' / 'sample_canonical.json'

    res = aggregate(str(kb), canonical_registry=CANONICAL_REGISTRY)
    save_json(res, str(outp))
    print('Wrote', outp)


if __name__ == '__main__':
    main()
