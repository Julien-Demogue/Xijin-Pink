"""Build (or rebuild) the RAG index from the corpus. Run:  python build_index.py"""

from rag.index import Index


def main():
    index = Index.build()
    index.save()
    print(f"indexed {len(index.chunks)} chunks from the corpus")
    by_doc = {}
    for c in index.chunks:
        by_doc[c.path] = by_doc.get(c.path, 0) + 1
    for path, n in sorted(by_doc.items()):
        print(f"  {n:2d}  {path}")


if __name__ == "__main__":
    main()
