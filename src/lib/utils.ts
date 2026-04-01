import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Counts = {
  // ===== Function and call-related =====
  /** Number of function calls (e.g., `foo()`). */
  call_fn: number;
  /** Number of method calls (e.g., `obj.method()`). */
  call_method: number;
  /** Number of macro invocations (e.g., `println!()`). */
  call_macro: number;

  // ===== Control flow structures =====
  /** Number of `if` blocks. */
  block_if: number;
  /** Number of `else` blocks. */
  block_else: number;
  /** Number of `match` expressions. */
  block_match: number;
  /** Number of `match` arms. */
  block_match_arms: number;
  /** Number of `for` loops. */
  block_for: number;
  /** Number of `while` loops. */
  block_while: number;
  /** Number of `loop` expressions. */
  block_loop: number;
  /** Number of `unsafe` blocks. */
  block_unsafe: number;

  // ===== Definitions =====
  /** Number of immutable variable bindings (`let`). */
  def_var: number;
  /** Number of mutable variable bindings (`let mut`). */
  def_var_mut: number;
  /** Number of function definitions (`fn`). */
  def_fn: number;
  /** Number of associated method definitions (all functions in an `impl` block, which includes trait implementation). */
  def_method: number;
  /** Number of async function definitions (`async fn`). */
  def_async_fn: number;
  /** Number of async method definitions (all async functions in an `impl` block, which includes trait implementation) */
  def_async_method: number;
  /** Number of trait definitions */
  def_trait: number;
  /** Number of type alias definitions (`type`). */
  def_type: number;
  /** Number of enum definitions. */
  def_enum: number;
  /** Number of struct definitions. */
  def_struct: number;
  /** Number of union definitions. */
  def_union: number;
  /** Number of module definitions (`mod`). */
  def_mod: number;
  /** Number of constant definitions (`const`). */
  def_const: number;
  /** Number of static item definitions (`static`). */
  def_static: number;
  /** Number of trait implementation blocks (`impl Trait for Type`). */
  trait_impl: number;
  /** Number of inherent implementation blocks (`impl Type`). */
  def_impl: number;
  /** Number of `macro_rules!` definitions. */
  def_macro_rules: number;

  // ===== Expressions and operators =====
  /** Number of closure expressions (`|x| x + 1`). */
  expr_closure: number;
  /** Number of await expressions (`.await`). */
  expr_await: number;
  /** Number of try expressions (`?` operator). */
  expr_try: number;
  /** Number of return expressions. */
  expr_return: number;
  /** Number of yield expressions (generators). */
  expr_yield: number;
  /** Number of binary operations (`+`, `-`, `*`, etc.). */
  expr_binop: number;
  /** Number of unary operations (`!`, `-x`, etc.). */
  expr_unop: number;

  // ===== Imports and modules =====
  /** Number of `use` statements. */
  use_stmt: number;
  /** Number of `extern crate` declarations. */
  extern_crate: number;

  // ===== Structural metrics =====
  /** Number of struct fields across all structs. */
  def_struct_fields: number;
  /** Number of enum variants across all enums. */
  def_enum_variants: number;
  /** Number of items inside `trait` definitions. */
  def_trait_members: number;
  /** Number of items inside `impl` blocks. */
  def_impl_members: number;

  // ===== Miscellaneous =====
  /** Number of `#[test]` functions. */
  def_test_fn: number;
};

export const COUNTS_LABELS_LONG: Record<string, string> = {
  // 明确这是 static，因为方法本质上也是函数
  // 但在下面短的标签上加上 static 会太长
  call_fn: "Static Function Calls",
  call_method: "Method Calls",
  call_macro: "Macro Calls",
  block_if: "If Blocks",
  block_else: "Else Blocks",
  block_match: "Match Blocks",
  block_match_arms: "Match Arms",
  block_for: "For Loops",
  block_while: "While Loops",
  block_loop: "Infinite Loops",
  block_unsafe: "Unsafe Blocks",
  def_var: "Variable Declarations",
  def_var_mut: "Mutable Variable Declarations",
  def_fn: "Functions",
  def_method: "Methods",
  def_async_fn: "Async Functions",
  def_async_method: "Async Methods",
  def_trait: "Traits",
  def_type: "Type Aliases",
  def_enum: "Enums",
  def_struct: "Structs",
  def_union: "Unions",
  def_mod: "Modules",
  def_const: "Constants",
  def_static: "Statics",
  trait_impl: "Trait Implementations",
  def_impl: "Implementation Blocks",
  def_macro_rules: "Macro Definitions",
  expr_closure: "Closures",
  expr_await: "Await Expressions",
  expr_try: "Try (?) Operators",
  expr_return: "Return Expressions",
  expr_yield: "Yield Expressions",
  expr_binop: "Binary Operations",
  expr_unop: "Unary Operations",
  use_stmt: "Use Statements",
  extern_crate: "Extern Crates",
  def_struct_fields: "Struct Fields",
  def_enum_variants: "Enum Variants",
  def_trait_members: "Trait Members",
  def_impl_members: "Implementation Members",
  def_test_fn: "Test Functions",
};

export const COUNTS_LABELS_SHORT: Record<string, string> = {
  call_fn: "Fn Calls",
  call_method: "Method Calls",
  call_macro: "Macro Calls",
  block_if: "If Blocks",
  block_else: "Else Blocks",
  block_match: "Match Exprs",
  block_match_arms: "Match Arms",
  block_for: "For Loops",
  block_while: "While Loops",
  block_loop: "Inf. Loops",
  block_unsafe: "Unsafe Blocks",
  def_var: "Vars",
  def_var_mut: "Mutable Vars",
  def_fn: "Functions",
  def_method: "Methods",
  def_async_fn: "Async Fns",
  def_async_method: "Async Methods",
  def_trait: "Traits",
  def_type: "Type Aliases",
  def_enum: "Enums",
  def_struct: "Structs",
  def_union: "Unions",
  def_mod: "Modules",
  def_const: "Constants",
  def_static: "Statics",
  trait_impl: "Trait Impls",
  def_impl: "Impl Blocks",
  def_macro_rules: "Macro Defs",
  expr_closure: "Closures",
  expr_await: "Awaits",
  expr_try: "? Ops",
  expr_return: "Returns",
  expr_yield: "Yields",
  expr_binop: "Binary Ops",
  expr_unop: "Unary Ops",
  use_stmt: "Use Stmts",
  extern_crate: "Extern Crates",
  def_struct_fields: "Struct Fields",
  def_enum_variants: "Enum Variants",
  def_trait_members: "Trait Members",
  def_impl_members: "Impl Members",
  def_test_fn: "Test Fns",
};

/** Converts a hexadecimal string to a byte array. Returns null for invalid input. */
function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    bytes[i] = byte;
  }
  return bytes;
}

/**
 * Verifies an HMAC-SHA256 signature in "sha256=<hex>" format using a
 * constant-time comparison via `crypto.subtle.verify`.
 */
export async function verifyHmacSha256(
  secret: string,
  body: string,
  signature: string,
): Promise<boolean> {
  const prefix = "sha256=";
  if (!signature.startsWith(prefix)) return false;
  const signatureBytes = hexToBytes(signature.slice(prefix.length));
  if (!signatureBytes) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(body),
  );
}
