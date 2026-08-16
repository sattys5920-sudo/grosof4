const IMAGE_MAX_DIM = 1000
const IMAGE_QUALITY = 0.75

// Firestore 문서 하나에 다 들어가는 구조라, 원본 사진을 그대로 올리면 용량을 크게
// 잡아먹을 수 있다. 캔버스로 적당한 크기까지만 줄이고 JPEG로 압축해서 저장한다.
export function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지를 읽을 수 없다'))
      img.onload = () => {
        const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('캔버스를 사용할 수 없다'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
