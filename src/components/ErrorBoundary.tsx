import { Component, type ReactNode } from 'react'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  handleRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason
    const error = reason instanceof Error ? reason : new Error(String(reason))
    this.setState({ error })
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleRejection)
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleRejection)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="errbound">
          <span className="errbound__eyebrow">뭔가 잘못됐다</span>
          <p className="errbound__msg">{this.state.error.message}</p>
          <pre className="errbound__stack">{this.state.error.stack}</pre>
          <button className="errbound__retry" onClick={() => this.setState({ error: null })}>
            다시 시도
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
