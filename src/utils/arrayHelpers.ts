/**
 * Moves an element in an array from one index to another
 */
export function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): void {
  if (toIndex < 0 || toIndex >= arr.length) {
    return;
  }

  const element = arr[fromIndex];
  arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, element);
}
