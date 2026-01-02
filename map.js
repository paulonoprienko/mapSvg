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

let isDragging = false;
let previousPointerPos = { x: 0, y: 0 };
let activePointers = [];
let previousDist = 0;

const applyPan = (ptX, ptY, isDragging) => {
  if (!isDragging) return;
  const vb = svg.viewBox.baseVal;

  let dx = ptX - previousPointerPos.x;
  let dy = ptY - previousPointerPos.y;

  dx = (dx / rect.width) * vb.width;
  dy = (dy / rect.height) * vb.height;

  let newX = vb.x - dx;
  let newY = vb.y - dy;

  newX = Math.max(0, Math.min(newX, initialVB.width - vb.width));
  newY = Math.max(0, Math.min(newY, initialVB.height - vb.height));

  previousPointerPos = { x: ptX, y: ptY };

  svg.setAttribute("viewBox", `${newX} ${newY} ${vb.width} ${vb.height}`);
};

const applyZoom = (factor, ptX, ptY) => {
  const vb = svg.viewBox.baseVal;

  let newWidth = vb.width * factor;
  let newHeight = vb.height * factor;

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
    const factor = e.deltaY > 0 ? 1.15 : 0.85;
    applyZoom(factor, e.screenX, e.screenY);
  },
  { passive: false }
);

const handlePointerEnd = (e) => {
  activePointers = activePointers.filter((p) => e.pointerId !== p.id);
  svg.releasePointerCapture(e.pointerId);

  if (activePointers.length === 0) {
    isDragging = false;
  } else if (activePointers.length < 2) {
    previousDist = 0;
    previousPointerPos = {
      x: activePointers[0].x,
      y: activePointers[0].y,
    };
  }
};

const getDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
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
    previousDist = getDistance(activePointers[0], activePointers[1]);
  }
});

svg.addEventListener("pointerup", handlePointerEnd);
svg.addEventListener("pointercancel", handlePointerEnd);

svg.addEventListener("pointermove", (e) => {
  const index = activePointers.findIndex((p) => p.id === e.pointerId);
  if (index === -1) return;

  activePointers[index].x = e.screenX;
  activePointers[index].y = e.screenY;

  if (activePointers.length === 1) {
    applyPan(activePointers[index].x, activePointers[index].y, isDragging);
  } else if (activePointers.length === 2) {
    const currentDist = getDistance(activePointers[0], activePointers[1]);
    if (previousDist > 0) {
      const factor = previousDist / currentDist;
      const midPoint = {
        x: (activePointers[0].x + activePointers[1].x) / 2,
        y: (activePointers[0].y + activePointers[1].y) / 2,
      };

      applyPan(midPoint.x, midPoint.y, isDragging);
      applyZoom(factor, midPoint.x, midPoint.y);
    }

    previousDist = currentDist;
  }
});
