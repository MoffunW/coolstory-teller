function interleaveArrays(firstArray, secondArray) {
  let maxLen = Math.max(firstArray.length, secondArray.length);

  const mainArr = [firstArray, secondArray];

  mainArr.forEach((arr) => {
    let lenDiff = maxLen - arr.length;
    for (let i = lenDiff; i > 0; i--) {
      arr.push(null);
    }
  });

  let newArr = [];
  mainArr.forEach((arr, idx1) => {
    arr.forEach((el, idx2) => {
      newArr[idx2 * mainArr.length + idx1] = el;
    });
  });

  return newArr.filter(Boolean);
}

module.exports = {
  interleaveArrays: interleaveArrays,
};
