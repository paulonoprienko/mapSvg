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

svg.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const vb = svg.viewBox.baseVal;

    const delta = e.deltaY > 0 ? 1.15 : 0.85;

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
    pt.x = e.clientX;
    pt.y = e.clientY;

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
  },
  { passive: false }
);

let isDragging = false;
let previousPointerPos = { x: 0, y: 0 };
let activePointers = [];

const handlePointerEnd = (e) => {
  activePointers = activePointers.filter((p) => e.pointerId !== p.id);
  svg.releasePointerCapture(e.pointerId);

  if (!activePointers.length) {
    isDragging = false;
  }
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
});

svg.addEventListener("pointerup", handlePointerEnd);
svg.addEventListener("pointercancel", handlePointerEnd);

svg.addEventListener("pointermove", (e) => {
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
});
