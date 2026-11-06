/*
MIT License

Copyright (c) 2026 Shane

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
// Shows what went wrong when the composer cannot start with the chosen options, instead of a blank
// page. The bar's Reset (or any change of settings) rebuilds it.
import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class EditorErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error("playground: the editor could not start with these options", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page">
        <main>
          <div className="card error-card" role="alert">
            <h2>The editor could not start with these options</h2>
            <p>{this.state.error.message}</p>
            <p className="muted">Change an option, or press Reset in the bar.</p>
          </div>
        </main>
      </div>
    );
  }
}
