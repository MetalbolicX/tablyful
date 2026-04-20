open Test
open Assertions

// ── fromArray ──────────────────────────────────────────────────────────────

test("Iter: fromArray iterates all elements", () => {
  let result = Bindings.Iter.fromArray([1, 2, 3])->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [1, 2, 3], ~operator="array equals")
})

test("Iter: fromArray on empty array yields no elements", () => {
  let result = Bindings.Iter.fromArray([])->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [], ~operator="array equals")
})

// ── fromSet ────────────────────────────────────────────────────────────────

test("Iter: fromSet iterates all set elements", () => {
  let s = Set.make()
  s->Set.add(10)
  s->Set.add(20)
  s->Set.add(30)
  let result = Bindings.Iter.fromSet(s)->Bindings.Iter.toArray->Array.toSorted(Int.compare)
  assertion((a, b) => a == b, result, [10, 20, 30], ~operator="array equals")
})

// ── fromMap ────────────────────────────────────────────────────────────────

test("Iter: fromMap iterates key-value pairs", () => {
  let m = Map.make()
  m->Map.set("a", 1)
  m->Map.set("b", 2)
  let result = Bindings.Iter.fromMap(m)->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [("a", 1), ("b", 2)], ~operator="array equals")
})

// ── Array.values ───────────────────────────────────────────────────────────

test("Iter: values returns iterator over array values", () => {
  let result = Bindings.Iter.values([10, 20, 30])->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [10, 20, 30], ~operator="array equals")
})

// ── Array.entries ──────────────────────────────────────────────────────────

test("Iter: entries returns index-value pairs", () => {
  let result = Bindings.Iter.entries(["a", "b", "c"])->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [(0, "a"), (1, "b"), (2, "c")], ~operator="array equals")
})

// ── Array.keys ─────────────────────────────────────────────────────────────

test("Iter: keys returns array indices", () => {
  let result = Bindings.Iter.keys([10, 20, 30])->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [0, 1, 2], ~operator="array equals")
})

// ── map ────────────────────────────────────────────────────────────────────

test("Iter: map transforms each element", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3])
    ->Bindings.Iter.map(x => x * 2)
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [2, 4, 6], ~operator="array equals")
})

test("Iter: map changes element type", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3])
    ->Bindings.Iter.map(x => `val-${Int.toString(x)}`)
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, ["val-1", "val-2", "val-3"], ~operator="array equals")
})

// ── filter ─────────────────────────────────────────────────────────────────

test("Iter: filter keeps matching elements", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3, 4, 5])
    ->Bindings.Iter.filter(x => mod(x, 2) == 0)
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [2, 4], ~operator="array equals")
})

test("Iter: filter returns empty when nothing matches", () => {
  let result =
    Bindings.Iter.fromArray([1, 3, 5])
    ->Bindings.Iter.filter(x => mod(x, 2) == 0)
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [], ~operator="array equals")
})

// ── take ───────────────────────────────────────────────────────────────────

test("Iter: take limits number of elements", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3, 4, 5])
    ->Bindings.Iter.take(3)
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [1, 2, 3], ~operator="array equals")
})

test("Iter: take(0) yields nothing", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3])
    ->Bindings.Iter.take(0)
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [], ~operator="array equals")
})

test("Iter: take more than available returns all", () => {
  let result =
    Bindings.Iter.fromArray([1, 2])
    ->Bindings.Iter.take(10)
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [1, 2], ~operator="array equals")
})

// ── drop ───────────────────────────────────────────────────────────────────

test("Iter: drop skips first n elements", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3, 4, 5])
    ->Bindings.Iter.drop(2)
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [3, 4, 5], ~operator="array equals")
})

test("Iter: drop all returns empty", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3])
    ->Bindings.Iter.drop(3)
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [], ~operator="array equals")
})

test("Iter: drop more than available returns empty", () => {
  let result =
    Bindings.Iter.fromArray([1, 2])
    ->Bindings.Iter.drop(10)
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [], ~operator="array equals")
})

// ── forEach ────────────────────────────────────────────────────────────────

test("Iter: forEach executes for each element", () => {
  let collected = []
  Bindings.Iter.fromArray([10, 20, 30])->Bindings.Iter.forEach(x => collected->Array.push(x))
  assertion((a, b) => a == b, collected, [10, 20, 30], ~operator="array equals")
})

// ── toArray ────────────────────────────────────────────────────────────────

test("Iter: toArray collects iterator into array", () => {
  let result = Bindings.Iter.fromArray([5, 6, 7])->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [5, 6, 7], ~operator="array equals")
})

// ── every ──────────────────────────────────────────────────────────────────

test("Iter: every returns true when all match", () => {
  let result =
    Bindings.Iter.fromArray([2, 4, 6])->Bindings.Iter.every(x => mod(x, 2) == 0)
  expectTrue(result)
})

test("Iter: every returns false when one fails", () => {
  let result =
    Bindings.Iter.fromArray([2, 3, 6])->Bindings.Iter.every(x => mod(x, 2) == 0)
  expectTrue(!result)
})

test("Iter: every on empty iterator returns true", () => {
  let result =
    Bindings.Iter.fromArray([])->Bindings.Iter.every(x => x > 0)
  expectTrue(result)
})

// ── some ───────────────────────────────────────────────────────────────────

test("Iter: some returns true when at least one matches", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3])->Bindings.Iter.some(x => x == 2)
  expectTrue(result)
})

test("Iter: some returns false when none match", () => {
  let result =
    Bindings.Iter.fromArray([1, 3, 5])->Bindings.Iter.some(x => x == 2)
  expectTrue(!result)
})

test("Iter: some on empty iterator returns false", () => {
  let result =
    Bindings.Iter.fromArray([])->Bindings.Iter.some(x => x > 0)
  expectTrue(!result)
})

// ── reduce (with initial value) ────────────────────────────────────────────

test("Iter: reduce with initial value accumulates correctly", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3])->Bindings.Iter.reduce((acc, x) => acc + x, 10)
  assertion((a, b) => a == b, result, 16, ~operator="equals")
})

test("Iter: reduce with initial value on empty returns initial", () => {
  let result =
    Bindings.Iter.fromArray([])->Bindings.Iter.reduce((acc, x) => acc + x, 0)
  assertion((a, b) => a == b, result, 0, ~operator="equals")
})

// ── reduce1 (without initial value) ────────────────────────────────────────

test("Iter: reduce1 uses first element as initial", () => {
  let result =
    Bindings.Iter.fromArray([10, 20, 30])->Bindings.Iter.reduce1((acc, x) => acc + x)
  assertion((a, b) => a == b, result, 60, ~operator="equals")
})

// ── find ───────────────────────────────────────────────────────────────────

test("Iter: find returns first matching element", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3, 4])->Bindings.Iter.find(x => x > 2)
  switch result {
  | Some(v) => assertion((a, b) => a == b, v, 3, ~operator="equals")
  | None => failTest("Expected Some(3)")
  }
})

test("Iter: find returns None when no match", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3])->Bindings.Iter.find(x => x > 10)
  switch result {
  | Some(_) => failTest("Expected None")
  | None => expectTrue(true)
  }
})

// ── flatMap ────────────────────────────────────────────────────────────────

test("Iter: flatMap maps and flattens", () => {
  let result =
    Bindings.Iter.fromArray(["a b", "c"])
    ->Bindings.Iter.flatMap(x => Bindings.Iter.fromArray(x->String.split(" ")))
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, ["a", "b", "c"], ~operator="array equals")
})

test("Iter: flatMap with empty inner iterators", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3])
    ->Bindings.Iter.flatMap(x => Bindings.Iter.fromArray(x == 2 ? [] : [x]))
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [1, 3], ~operator="array equals")
})

// ── Chaining / composition ─────────────────────────────────────────────────

test("Iter: chaining map + filter + take + toArray", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    ->Bindings.Iter.filter(x => mod(x, 2) == 0)
    ->Bindings.Iter.map(x => x * 10)
    ->Bindings.Iter.take(3)
    ->Bindings.Iter.toArray
  assertion((a, b) => a == b, result, [20, 40, 60], ~operator="array equals")
})

test("Iter: chaining drop + map + every", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3, 4, 5])
    ->Bindings.Iter.drop(2)
    ->Bindings.Iter.map(x => x * x)
    ->Bindings.Iter.every(x => x >= 9)
  expectTrue(result)
})

test("Iter: chaining filter + some", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3, 4, 5])
    ->Bindings.Iter.filter(x => mod(x, 2) == 0)
    ->Bindings.Iter.some(x => x > 3)
  expectTrue(result)
})

test("Iter: chaining map + reduce", () => {
  let result =
    Bindings.Iter.fromArray([1, 2, 3])
    ->Bindings.Iter.map(x => x * x)
    ->Bindings.Iter.reduce((acc, x) => acc + x, 0)
  assertion((a, b) => a == b, result, 14, ~operator="equals")
})

test("Iter: chaining filter + find", () => {
  let result =
    Bindings.Iter.fromArray([10, 20, 30, 40, 50])
    ->Bindings.Iter.filter(x => x > 15)
    ->Bindings.Iter.find(x => x >= 30)
  switch result {
  | Some(v) => assertion((a, b) => a == b, v, 30, ~operator="equals")
  | None => failTest("Expected Some(30)")
  }
})
