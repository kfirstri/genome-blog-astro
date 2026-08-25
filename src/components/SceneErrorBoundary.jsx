import * as React from 'react';

const e = React.createElement;

// The original design ran the Three.js scene in its own `ReactDOMClient.createRoot()`,
// separate from the outer chrome, so a WebGL/shader failure inside the scene could never
// take down the chrome — it just left a stuck loader. This port renders the scene inside
// the same React tree as the chrome, and R3F's <Canvas> rethrows internal errors, so
// without a boundary a canvas failure would unmount the whole island (a blank page, no
// diagnostic). This boundary catches that and reports it through `onError` so the caller
// can surface it via the existing `state.error` / `chromeProps().error` chrome UI (the
// "Could not load the 3D scene" card), matching the original's error framing.
export default class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (this.props.onError) this.props.onError(error);
  }

  render() {
    // Render nothing in place of the scene once it has failed — the chrome's error card
    // (driven by `onError` above) is what tells the user what happened.
    return this.state.hasError ? null : this.props.children;
  }
}
