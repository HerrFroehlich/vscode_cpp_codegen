export async function asyncForEach<Type>(
  array: Type[],
  asyncIterator: (item: Type, index: number) => void | Promise<void>,
  onReject?: (error: any) => void
): Promise<void> {
  const promises = array.map((item: Type, index: number) =>
    asyncIterator(item, index)
  );
  const allPromise = Promise.all(promises);
  if (onReject) {
    allPromise.catch((error) => onReject(error));
  }
  await allPromise;
}
