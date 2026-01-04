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

const { x, y, width, height } = svg.viewBox.baseVal;
const initialVB = { x, y, width, height };

let mapState = {
  x: initialVB.x,
  y: initialVB.y,
  width: initialVB.width,
  height: initialVB.height,
};

const inputState = {
  isDragging: false,
  previousPointerPos: { x: 0, y: 0 },
  activePointers: [],
  previousDist: 0,
};

const scheduler = {
  renderScheduled: false,

  createRenderer(rendererFn) {
    return () => {
      if (!this.renderScheduled) {
        this.renderScheduled = true;
        requestAnimationFrame(() => {
          rendererFn();
          this.renderScheduled = false;
        });
      }
    };
  },
};

const performSetViewBoxRender = () => {
  const { x, y, width, height } = mapState;
  svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
};

const scheduleRender = scheduler.createRenderer(performSetViewBoxRender);

const minWidth = mapState.width / 4;
const minHeight = mapState.height / 4;
const rect = svg.getBoundingClientRect();

const applyPan = (ptX, ptY) => {
  if (!inputState.isDragging) return;
  const { x, y, width, height } = mapState;

  let dx = ptX - inputState.previousPointerPos.x;
  let dy = ptY - inputState.previousPointerPos.y;

  dx = (dx / rect.width) * width;
  dy = (dy / rect.height) * height;

  let newX = x - dx;
  let newY = y - dy;

  newX = Math.max(0, Math.min(newX, initialVB.width - width));
  newY = Math.max(0, Math.min(newY, initialVB.height - height));

  inputState.previousPointerPos = { x: ptX, y: ptY };

  mapState = {
    ...mapState,
    x: newX,
    y: newY,
  };

  scheduleRender();
};

const applyZoom = (factor, ptX, ptY) => {
  const { x, y, width, height } = mapState;

  let newWidth = width * factor;
  let newHeight = height * factor;

  if (newWidth > initialVB.width || newHeight > initialVB.height) {
    newWidth = initialVB.width;
    newHeight = initialVB.height;
  }

  if (newWidth < minWidth || newHeight < minHeight) {
    newWidth = width;
    newHeight = height;
  }

  if (newWidth === width || newHeight === height) return;

  const pt = svg.createSVGPoint();
  pt.x = ptX;
  pt.y = ptY;

  const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

  const ratioX = (svgP.x - x) / width;
  const ratioY = (svgP.y - y) / height;

  const dw = width - newWidth;
  const dh = height - newHeight;

  let newX = x + dw * ratioX;
  let newY = y + dh * ratioY;

  newX = Math.max(0, Math.min(newX, initialVB.width - newWidth));
  newY = Math.max(0, Math.min(newY, initialVB.height - newHeight));

  mapState = {
    ...mapState,
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  };

  scheduleRender();
};

svg.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 0.85;
    applyZoom(factor, e.clientX, e.clientY);
  },
  { passive: false }
);

const handlePointerEnd = (e) => {
  let { activePointers } = inputState;
  inputState.activePointers = activePointers.filter(
    (p) => e.pointerId !== p.id
  );
  svg.releasePointerCapture(e.pointerId);

  if (activePointers.length === 0) {
    inputState.isDragging = false;
  } else if (activePointers.length < 2) {
    inputState.previousDist = 0;
    inputState.previousPointerPos = {
      x: activePointers[0].x,
      y: activePointers[0].y,
    };
  }
};

const getDistance = (p1, p2) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

const getMidPoint = (p1, p2) => ({
  x: (p1.x + p2.x) / 2,
  y: (p1.y + p2.y) / 2,
});

svg.addEventListener("pointerdown", (e) => {
  inputState.isDragging = true;

  svg.setPointerCapture(e.pointerId);
  let { activePointers } = inputState;
  activePointers.push({
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
  });

  if (activePointers.length === 1) {
    inputState.previousPointerPos = { x: e.clientX, y: e.clientY };
  }

  if (activePointers.length === 2) {
    inputState.previousDist = getDistance(activePointers[0], activePointers[1]);
    inputState.previousPointerPos = getMidPoint(
      activePointers[0],
      activePointers[1]
    );
  }
});

svg.addEventListener("pointerup", handlePointerEnd);
svg.addEventListener("pointercancel", handlePointerEnd);

svg.addEventListener("pointermove", (e) => {
  const { activePointers } = inputState;
  const { previousDist } = inputState;
  const index = activePointers.findIndex((p) => p.id === e.pointerId);
  if (index === -1) return;

  activePointers[index].x = e.clientX;
  activePointers[index].y = e.clientY;

  if (activePointers.length === 1) {
    applyPan(activePointers[index].x, activePointers[index].y);
  } else if (activePointers.length === 2) {
    const currentDist = getDistance(activePointers[0], activePointers[1]);
    if (previousDist > 0) {
      const factor = previousDist / currentDist;
      const midPoint = getMidPoint(activePointers[0], activePointers[1]);

      applyPan(midPoint.x, midPoint.y);
      applyZoom(factor, midPoint.x, midPoint.y);
    }

    inputState.previousDist = currentDist;
  }
});
