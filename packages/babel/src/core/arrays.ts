export function forEach<T>(arr: T[], callback: (value: T, index: number) => (boolean | void)) {
  for (let i = 0, len = arr.length; i < len; i += 1) {
    if (callback(arr[i], i)) {
      break;
    }
  }
}

export function some<T>(arr: T[], callback: (value: T, index: number) => boolean) {
  for (let i = 0, len = arr.length; i < len; i += 1) {
    if (callback(arr[i], i)) {
      return true;
    }
  }
  return false;
}

export function every<T>(arr: T[], callback: (value: T, index: number) => boolean) {
  for (let i = 0, len = arr.length; i < len; i += 1) {
    if (!callback(arr[i], i)) {
      return false;
    }
  }
  return true;
}
