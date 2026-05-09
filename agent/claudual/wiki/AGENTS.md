# Claudual Wiki Schema

## Structure
- `raw/`: Immutable source documents.
- `wiki/`: LLM-generated markdown files.
- `wiki/index.md`: Catalog of all pages.
- `wiki/log.md`: Chronological log of operations.

## Conventions
- Use `[[Wiki Link]]` for cross-references.
- Every ingest must update `log.md` and `index.md`.
- New entities should get their own pages in `wiki/`.

## Workflows
1. **Ingest**: Read source -> Update relevant pages -> Update Index -> Log.
2. **Query**: Read Index -> Find relevant pages -> Synthesize Answer.
3. **Lint**: Check for contradictions and broken links.
