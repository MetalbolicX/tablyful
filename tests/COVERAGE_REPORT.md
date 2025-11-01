# Code Coverage Report

## Overall Coverage

```
----------------|---------|----------|---------|---------|-------------------
File            | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------|---------|----------|---------|---------|-------------------
All files       |   75.52 |    65.52 |   73.97 |   75.88 |
```

**Summary**:
- **Statements**: 75.52% ✅
- **Branches**: 65.52% ⚠️ (could be improved)
- **Functions**: 73.97% ✅
- **Lines**: 75.88% ✅

## Coverage by Module

### API Layer (100% Coverage) ✅

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| factory.mts | 100% | 100% | 100% | 100% |
| tablyful.mts | 100% | 90.9% | 100% | 100% |

**Status**: Excellent! The public API is fully tested.

### Core Parsers (80.46% Coverage) ✅

| Parser | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| array-parser.mts | 72% | 71.42% | 81.81% | 73.91% |
| base-parser.mts | 79.66% | 65.3% | 85.71% | 84.9% |
| nested-object-parser.mts | 78.18% | 58.33% | 85.71% | 77.35% |
| object-of-arrays-parser.mts | 77.77% | 63.63% | 92.3% | 79.06% |
| object-parser.mts | 96.77% | 92.3% | 100% | 96.42% |

**Status**: Good coverage. Most common paths tested.

### Base Formatters (65.67% Coverage) ⚠️

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| base-formatter.mts | 50% | 62.96% | 54.54% | 47.69% |
| stream-formatter.mts | 87.5% | 83.33% | 75% | 87.5% |

**Status**: Moderate. Many base formatter methods are private/protected and not directly tested.

### CSV Formatter (78.57% Coverage) ✅

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| csv-formatter.mts | 96.55% | 88.88% | 88.88% | 96.29% |
| csv-stream.mts | 65.85% | 80% | 71.42% | 66.66% |

**Status**: Very good! Main formatter fully tested.

### HTML Formatter (73.17% Coverage) ✅

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| html-formatter.mts | 96.66% | 87.5% | 85.71% | 96.55% |
| html-stream.mts | 59.61% | 60% | 57.14% | 60.78% |

**Status**: Good. Main formatter well tested, stream needs more coverage.

### JSON Formatter (58.57% Coverage) ⚠️

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| json-formatter.mts | 96% | 83.33% | 100% | 95.45% |
| json-stream.mts | 37.77% | 23.52% | 38.46% | 39.53% |

**Status**: Main formatter excellent, but streaming has low coverage (lines 40, 68-160 uncovered).

### LaTeX Formatter (75.84% Coverage) ✅

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| latex-formatter.mts | 97.01% | 86.95% | 100% | 96.92% |
| latex-stream.mts | 63.06% | 45.83% | 72.72% | 62.72% |

**Status**: Main formatter excellent, streaming moderate.

### Markdown Formatter (81.05% Coverage) ✅

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| markdown-formatter.mts | 95% | 80% | 88.88% | 94.73% |
| markdown-stream.mts | 70.9% | 70% | 75% | 69.81% |

**Status**: Very good coverage across the board.

### Types (100% Coverage) ✅

| File | Coverage |
|------|----------|
| options.mts | 100% all metrics |

**Status**: Perfect!

### Utils (35.71% Coverage) ❌

| File | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| either-or.mts | 0% | 0% | 0% | 0% |
| maybe.mts | 42.85% | 33.33% | 60% | 42.85% |
| pattern-matching.ts | 87.5% | 100% | 83.33% | 83.33% |

**Status**: Poor. `either-or.mts` is completely untested (lines 14-140).

## Areas for Improvement

### High Priority

1. **JSON Streaming Formatter** (37.77% coverage)
   - Lines 40, 68-160 not covered
   - Need tests for complex streaming scenarios
   - Need tests for array format streaming

2. **Either/Or Utility** (0% coverage)
   - Entire file untested (lines 14-140)
   - If used in production code, needs tests
   - If unused, consider removing

3. **Base Formatter** (50% coverage)
   - Lines 172, 248, 252, 261-286 not covered
   - Many private methods not tested
   - Consider testing through public API

### Medium Priority

4. **HTML Streaming** (59.61% coverage)
   - Lines 26-40, 157, 187-237 not covered
   - Need more streaming edge cases

5. **LaTeX Streaming** (63.06% coverage)
   - Lines 178, 239, 255, 272-276 not covered
   - Booktabs options not fully tested

6. **Maybe Utility** (42.85% coverage)
   - Lines 38-41, 58 not covered
   - Need tests for edge cases

### Low Priority

7. **Parser Edge Cases** (various 70-80% branch coverage)
   - Some error paths not tested
   - Some data validation scenarios uncovered

## Recommendations

### To Reach 90% Coverage

1. **Add streaming edge case tests**:
   - Empty streams
   - Single row streams
   - Error handling in streams
   - Memory pressure scenarios

2. **Test utility functions directly**:
   - Create `tests/unit/utils/` directory
   - Test `either-or.mts` exhaustively
   - Test `maybe.mts` edge cases

3. **Test error paths**:
   - Invalid data formats
   - Malformed structures
   - Boundary conditions

4. **Add more integration tests**:
   - File I/O scenarios
   - Chained transformations
   - Real-world datasets

### Coverage Thresholds

Recommended Jest configuration:

```javascript
coverageThreshold: {
  global: {
    statements: 80,
    branches: 70,
    functions: 80,
    lines: 80
  },
  './src/api/': {
    statements: 100,
    branches: 95,
    functions: 100,
    lines: 100
  },
  './src/formatters/!(*/stream*)': {
    statements: 95,
    branches: 85,
    functions: 90,
    lines: 95
  }
}
```

## What's Well Tested ✅

1. **All 5 main formatters**: CSV, JSON, HTML, Markdown, LaTeX (95%+ coverage)
2. **Public API**: Complete coverage of user-facing functions
3. **Factory functions**: Parser/formatter creation and detection
4. **Pattern matching utility**: Well tested (87.5%)
5. **Object parser**: Excellent coverage (96.77%)
6. **Options types**: Fully covered

## What Needs Work ⚠️

1. **Streaming formatters**: Need more edge case tests
2. **Either/Or utility**: Completely untested
3. **Base formatter internals**: Many private methods uncovered
4. **Error paths**: Some validation scenarios untested
5. **Maybe utility**: Need more edge case coverage

## Coverage Trend

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Statements | 75.52% | 90% | +14.48% |
| Branches | 65.52% | 80% | +14.48% |
| Functions | 73.97% | 90% | +16.03% |
| Lines | 75.88% | 90% | +14.12% |

**Estimated effort to reach 90%**: ~40-50 additional tests

## Conclusion

The test suite provides **strong coverage of the main functionality** (75.88% lines), with excellent coverage of:
- Public API (100%)
- Main formatters (95%+)
- Core parsers (80%+)

Areas needing improvement:
- Streaming edge cases
- Utility functions (especially `either-or.mts`)
- Error handling paths

**Overall Grade**: **B+** (Good, with room for improvement)

---

**Next Steps**:

1. Add streaming edge case tests
2. Test `either-or.mts` utility
3. Increase branch coverage to 80%+
4. Add coverage thresholds to Jest config
5. Set up automated coverage reporting in CI/CD
