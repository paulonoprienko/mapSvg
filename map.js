async function loadSVG(url) {
  try {
    return await fetch(url);
  } catch (error) {
    console.error("Ошибка загрузки SVG:", error);
  }
}

const container = document.getElementById("container");

const response = await loadSVG("map.svg");
const svgText = await response.text();

container.innerHTML = svgText;

const svg = document.getElementById("map");

const initialVB = {
  width: svg.viewBox.baseVal.width,
  height: svg.viewBox.baseVal.height,
};

const minWidth = initialVB.width / 4;
const minHeight = initialVB.height / 4;
const rect = svg.getBoundingClientRect();

// svg.addEventListener(
//   "wheel",
//   (e) => {
//     e.preventDefault();
//     const vb = svg.viewBox.baseVal;

//     const delta = e.deltaY > 0 ? 1.05 : 0.95;

//     let newWidth = vb.width * delta;
//     let newHeight = vb.height * delta;

//     if (newWidth > initialVB.width || newHeight > initialVB.height) {
//       newWidth = initialVB.width;
//       newHeight = initialVB.height;
//     }

//     if (newWidth < minWidth || newHeight < minHeight) {
//       newWidth = vb.width;
//       newHeight = vb.height;
//     }

//     if (newWidth === vb.width || newHeight === vb.height) return;

//     const mouseX = e.clientX - rect.left;
//     const mouseY = e.clientY - rect.top;

//     const dw = vb.width - newWidth;
//     const dh = vb.height - newHeight;

//     let dx = (mouseX / rect.width) * dw;
//     let dy = (mouseY / rect.height) * dh;

//     let newX = vb.x + dx;
//     let newY = vb.y + dy;

//     newX = Math.max(0, Math.min(newX, initialVB.width - newWidth));
//     newY = Math.max(0, Math.min(newY, initialVB.height - newHeight));

//     svg.setAttribute("viewBox", `${newX} ${newY} ${newWidth} ${newHeight}`);
//   },
//   { passive: false }
// );

const zoom = (delta, ptX, ptY) => {
  const vb = svg.viewBox.baseVal;

  let newWidth = vb.width * delta;
  let newHeight = vb.height * delta;

  if (newWidth > initialVB.width || newHeight > initialVB.height) {
    newWidth = initialVB.width;
    newHeight = initialVB.height;
  }

  if (newWidth < minWidth || newHeight < minHeight) {
    newWidth = vb.width;
    newHeight = vb.height;
  }

  if (newWidth === vb.width || newHeight === vb.height) return;

  const pt = svg.createSVGPoint();
  pt.x = ptX;
  pt.y = ptY;

  const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

  const ratioX = (svgP.x - vb.x) / vb.width;
  const ratioY = (svgP.y - vb.y) / vb.height;

  const dw = vb.width - newWidth;
  const dh = vb.height - newHeight;

  let newX = vb.x + dw * ratioX;
  let newY = vb.y + dh * ratioY;

  newX = Math.max(0, Math.min(newX, initialVB.width - newWidth));
  newY = Math.max(0, Math.min(newY, initialVB.height - newHeight));

  svg.setAttribute("viewBox", `${newX} ${newY} ${newWidth} ${newHeight}`);
};

svg.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.15 : 0.85;
    zoom(delta, e.clientX, e.clientY);
  },
  { passive: false }
);

let isDragging = false;
let previousPointerPos = { x: 0, y: 0 };
let activePointers = [];
let initialDist;

const handlePointerEnd = (e) => {
  activePointers = activePointers.filter((p) => e.pointerId !== p.id);
  svg.releasePointerCapture(e.pointerId);

  if (!activePointers.length) {
    isDragging = false;
  }
};

const getDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p2.x - p1.y, 2) + Math.pow(p2.y - p1.y, 2));
};

svg.addEventListener("pointerdown", (e) => {
  isDragging = true;
  previousPointerPos = { x: e.screenX, y: e.screenY };
  svg.setPointerCapture(e.pointerId);
  activePointers.push({
    id: e.pointerId,
    x: e.screenX,
    y: e.screenY,
  });

  if (activePointers.length === 2) {
    initialDist = getDistance(activePointers[0], activePointers[1]);

    alert("yo");
  }
});

svg.addEventListener("pointerup", handlePointerEnd);
svg.addEventListener("pointercancel", handlePointerEnd);

svg.addEventListener("pointermove", (e) => {
  const index = activePointers.findIndex((p) => p.id === e.pointerId);
  if (index === -1) return;

  activePointers[index].x = e.clientX;
  activePointers[index].y = e.clientY;

  if (activePointers.length === 1) {
    if (!isDragging) return;
    const vb = svg.viewBox.baseVal;

    let dx = e.screenX - previousPointerPos.x;
    let dy = e.screenY - previousPointerPos.y;

    dx = (dx / rect.width) * vb.width;
    dy = (dy / rect.height) * vb.height;

    let newX = vb.x - dx;
    let newY = vb.y - dy;

    newX = Math.max(0, Math.min(newX, initialVB.width - vb.width));
    newY = Math.max(0, Math.min(newY, initialVB.height - vb.height));

    previousPointerPos = { x: e.screenX, y: e.screenY };

    console.log(e);

    svg.setAttribute("viewBox", `${newX} ${newY} ${vb.width} ${vb.height}`);
  } else if (activePointers.length === 2) {
    const currentDist = getDistance(activePointers[0], activePointers[1]);
    const scaleChange = currentDist / initialDist;
    const midPoint = {
      x: (activePointers[0].x + activePointers[1].x) / 2,
      y: (activePointers[0].y + activePointers[1].y) / 2,
    };

    zoom(scaleChange, midPoint.x, midPoint.y);
  }
});
