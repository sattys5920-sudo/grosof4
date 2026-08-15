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
    // Firestore 쓰기 같은 fire-and-forget 비동기 작업 하나가 실패한다고 해서
    // 화면 전체를 크래시 화면으로 덮어 버리면 안 된다(실제로 여러 기능에서
    // "튕긴다"는 제보로 이어졌다). 진짜 화면이 깨지는 렌더링 에러만
    // getDerivedStateFromError로 잡고, 여기서는 콘솔에만 남긴다.
    console.error('처리되지 않은 프라미스 거부', event.reason)
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
