/** Zoom of the camera: 0 = close on the paper, 1 = the whole machine. Read every frame. */
export interface ViewControl {
  readonly zoom: number
  zoomBy(delta: number): void
}

export function createViewControl(initial: number): ViewControl {
  let zoom = initial
  return {
    get zoom() {
      return zoom
    },
    zoomBy(delta) {
      zoom = Math.min(1, Math.max(0, zoom + delta))
    },
  }
}
