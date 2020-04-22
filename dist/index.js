const input = document.querySelector('#input');
const canvas = document.querySelector('#canvas');
const image = document.querySelector('#image');
const zoomSlider = document.querySelector('#zoom');

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d');
const num_tiles_h_x = 8;
const num_tiles_h_y = 6;
const num_tiles_v_x = 6;
const num_tiles_v_y = 8;
const tile_size = 13;
const tileInfos = { horizontal: {}, vertical: {} };
let imageData;

function rgbToHex(val) { 
  let hex = Number(val).toString(16);
  if(hex.length < 2) {
    hex = '0' + hex;
  }
  return hex;
}

function fullColorHex(r,g,b) {   
  let red = rgbToHex(r);
  let green = rgbToHex(g);
  let blue = rgbToHex(b);
  return red + green + blue;
}

function assert(cond, msg) { if(!cond) throw new Error(msg); }

window.addEventListener('load', () => { 
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight; 
});

image.addEventListener('load', () => { 
  ctx.imageSmoothingEnabled  = false;
  ctx.drawImage(image, 0, 0);
  imageData = ctx.getImageData(0, 0, image.width, image.height);
  ctx.clearRect(0, 0, image.width, image.height);
  
  for(let y = 0; y < num_tiles_h_y; y++) {
    for(let x = 0; x < num_tiles_h_x; x++) {
      tileInfos.horizontal[`${x}_${y}`] = getTileInfo(x, y, true);
    }
  }
  for(let y = 0; y < num_tiles_v_y; y++) {
    for(let x = 0; x < num_tiles_v_x; x++) {
      tileInfos.vertical[`${x}_${y}`] = getTileInfo(x, y, false);
    }
  }
  
  drawMap();
});

function getValidTiles(constraints, type) {
  const validTiles = [];
  let max_x = type == 'horizontal' ? num_tiles_h_x : num_tiles_v_x
  let max_y = type == 'horizontal' ? num_tiles_h_y : num_tiles_v_y
  for(let y = 0; y < max_y; y++) {
    for(let x = 0; x < max_x; x++) {
      const tileInfo = tileInfos[type][`${x}_${y}`];
      let failed = false;
      for(let [key, value] of Object.entries(constraints.exits)) {
        if(tileInfo.exits[key] != value) {
          failed = true;
          break;
        }
      }
      if(failed) {
        continue;
      }
      validTiles.push({ x, y });
    }  
  }
  return validTiles;
}

function drawMap() {
  const mapData = {};
  const zoom = zoomSlider.value;
  ctx.lineWidth = '1';
  ctx.strokeStyle = 'red';
  for(let y = -1; y < 20; y++) {
    for(let x = -1; x < 38; x++) {
      // Horizontal
      if((x - y) % 4 == 0) {
        const constraints = { exits: {} };

        if(mapData[`${x-1}_${y}`] != undefined) {
          constraints.exits.left = mapData[`${x-1}_${y}`].right;
        }
        if(mapData[`${x}_${y-1}`] != undefined) {
          constraints.exits.topLeft = mapData[`${x}_${y-1}`].bottom;
        }
        if(mapData[`${x+1}_${y-1}`] != undefined) {
          constraints.exits.topRight = mapData[`${x+1}_${y-1}`].bottom;
        }
        if(mapData[`${x+2}_${y}`] != undefined) {
          constraints.exits.right = mapData[`${x+2}_${y}`].left;
        }

        let validTiles = getValidTiles(constraints, 'horizontal');
        const randomIndex = Math.floor(Math.random() * validTiles.length);
        const randomTile = validTiles[randomIndex];
        const tileInfo = tileInfos.horizontal[`${randomTile.x}_${randomTile.y}`]; //getTileInfo(tile_pick_x, tile_pick_y, true);
        const { x:tile_coords_x, y:tile_coords_y } = tilePosToPixelCoordinates(randomTile.x, randomTile.y, true);
        ctx.drawImage(image, tile_coords_x+1, tile_coords_y+1, tile_size*2, tile_size,
          x * tile_size * zoom, y * tile_size * zoom,
          tile_size*2*zoom, tile_size * zoom);

        mapData[`${x}_${y}`] = {
          top: tileInfo.exits.topLeft,
          left: tileInfo.exits.left,
          bottom: tileInfo.exits.bottomLeft,
        }
        mapData[`${x+1}_${y}`] = {
          top: tileInfo.exits.topRight,
          right: tileInfo.exits.right,
          bottom: tileInfo.exits.bottomRight,
        }
      }
      // Vertical down
      if((x - y) % 4 == 3 || (x - y) % 4 == -1) {
        const constraints = { exits: {} };

        if(mapData[`${x-1}_${y}`] != undefined) {
          constraints.exits.topLeft = mapData[`${x-1}_${y}`].right;
        }
        if(mapData[`${x}_${y-1}`] != undefined) {
          constraints.exits.top = mapData[`${x}_${y-1}`].bottom;
        }

        let validTiles = getValidTiles(constraints, 'vertical');
        const randomIndex = Math.floor(Math.random() * validTiles.length);
        const randomTile = validTiles[randomIndex];
        const tileInfo = tileInfos.vertical[`${randomTile.x}_${randomTile.y}`];

        const { x:tile_coords_x, y:tile_coords_y } = tilePosToPixelCoordinates(randomTile.x, randomTile.y, false);
        ctx.drawImage(image, tile_coords_x+1, tile_coords_y+1, tile_size, tile_size*2,
          x * tile_size * zoom, y * tile_size * zoom,
          tile_size*zoom, tile_size*2*zoom);

        mapData[`${x}_${y}`] = {
          left: tileInfo.exits.topLeft,
          top: tileInfo.exits.top,
          right: tileInfo.exits.topRight,
        }
        mapData[`${x}_${y+1}`] = {
          left: tileInfo.exits.bottomLeft,
          bottom: tileInfo.exits.bottom,
          right: tileInfo.exits.bottomRight,
        }
      }
    }
  }
}

function tilePosToPixelCoordinates(tx, ty, horizontal) {
  let x, y;
  if(horizontal) {
    x = tx * tile_size * 2 + 3 * tx;
    y = ty * tile_size + 3 * ty + 2;
  } else {
    const offset_vertical_tiles_start = num_tiles_h_y * (tile_size + 3) + 4;
    x = tx * tile_size + 3 * tx;
    y = ty * tile_size * 2 + 3 * ty;
    y += offset_vertical_tiles_start;
  }
  return { x, y }
}

function getPixelData(imageData, x, y, width, height) {
  let r = imageData[(y * width + x) * 4 + 0];
  let g = imageData[(y * width + x) * 4 + 1];
  let b = imageData[(y * width + x) * 4 + 2];
  let a = imageData[(y * width + x) * 4 + 3];
  return [ a, r, g, b ];
}

function getTileInfo(tx, ty, horizontal) {
  let points_h = {
    info: {
      topLeft: { x: 0, y: 0 },
      top: { x: tile_size, y: 0 },
      topRight: { x: tile_size*2+1, y: 0 },
      bottomLeft: { x: 0, y: tile_size+1 },
      bottom: { x: tile_size, y: tile_size+1 },
      bottomRight: { x: tile_size*2+1, y: tile_size+1 },
    },
    exits: {
      topLeft: { x: Math.floor(tile_size * 0.5), y: 0 },
      topRight: { x: Math.floor(tile_size * 1.5), y: 0 },
      left: { x: 0, y: Math.floor(tile_size * 0.5) },
      right: { x: tile_size * 2 + 1, y: Math.floor(tile_size * 0.5) },
      bottomLeft: { x: Math.floor(tile_size * 0.5), y: tile_size + 1 },
      bottomRight: { x: Math.floor(tile_size * 1.5), y: tile_size + 1 },
    }
  }

  let points_v = {
    info: {
      topLeft: { x: 0, y: 0 },
      topRight: { x: tile_size+1, y: 0 },
      left: { x: 0, y: tile_size },
      right: { x: tile_size+1, y: tile_size },
      bottomLeft: { x: 0, y: tile_size*2+1 },
      bottomRight: { x: tile_size+1, y: tile_size*2+1 },
    },
    exits: {
      topLeft: { x: 0, y: Math.floor(tile_size * 0.5) },
      top: { x: Math.floor(tile_size * 0.5), y: 0 },
      topRight: { x: tile_size+1, y: Math.floor(tile_size * 0.5) },
      bottomLeft: { x: 0, y: Math.floor(tile_size * 1.5) },
      bottom: { x: Math.floor(tile_size * 0.5), y: tile_size*2 + 1 },
      bottomRight: { x: tile_size+1, y: Math.floor(tile_size * 1.5) },
    }
  }

  const points = horizontal ? points_h : points_v;

  let tileCoords = tilePosToPixelCoordinates(tx, ty, horizontal);
  for(let [key, value] of Object.entries(points.info)) {
    let x = tileCoords.x + value.x;
    let y = tileCoords.y + value.y;    
    const [ a, r, g, b ] = getPixelData(imageData.data, x, y, imageData.width, imageData.height);
    points.info[key] = fullColorHex(r, g, b);
  }
  for(let [key, value] of Object.entries(points.exits)) {
    let x = tileCoords.x + value.x;
    let y = tileCoords.y + value.y;    
    const [ a, r, g, b ] = getPixelData(imageData.data, x, y, imageData.width, imageData.height);
    points.exits[key] = fullColorHex(r, g, b);
  }

  return points;
}

input.addEventListener('input', ev => {
  const file = ev.target.files[0];
  const reader = new FileReader();
  reader.addEventListener('load', ev => {
    const result = ev.target.result;
    image.src = result;
  });
  reader.readAsDataURL(file);
});
