/* From https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript */

function xmur3(str) {
  for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
      h = h << 13 | h >>> 19;
  return function() {
      h = Math.imul(h ^ h >>> 16, 2246822507);
      h = Math.imul(h ^ h >>> 13, 3266489909);
      return (h ^= h >>> 16) >>> 0;
  }
}

function sfc32(a, b, c, d) {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
    var t = (a + b) | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    d = d + 1 | 0;
    t = t + d | 0;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  }
}

/* 
Returns a function that takes x, y and spits out the same random number for the same x, y
seed is a string
*/
function prng_create(seed) {
  return (x, y) => {
    const seed_ = xmur3(seed);
    const rng = sfc32(seed_(), seed_(), x, y);
    for(let i = 0; i < 10; i++) {
      rng(); 
    }
    return rng();
  };
}

const crc32 = function(r){for(var a,o=[],c=0;c<256;c++){a=c;for(var f=0;f<8;f++)a=1&a?3988292384^a>>>1:a>>>1;o[c]=a}
for(var n=-1,t=0;t<r.length;t++)n=n>>>8^o[255&(n^r.charCodeAt(t))];return(-1^n)>>>0};

const number_to_hash = (number) => crc32(number.toString()).toString(16).toUpperCase();

export {
 prng_create,
 number_to_hash
}