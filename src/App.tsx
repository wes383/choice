import { useState, useRef, useEffect } from 'react'
import './App.css'
import Card from './components/Card'

function App() {
  const [cards, setCards] = useState<Array<{ id: number; title: string }>>([])
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set())
  const [draggingCard, setDraggingCard] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false)
  const [shufflingIndex, setShufflingIndex] = useState(0)
  const [drawComplete, setDrawComplete] = useState(false)
  const [scatterPositions, setScatterPositions] = useState<Map<number, { x: number; y: number; rotation: number }>>(new Map())
  const [drawCount, setDrawCount] = useState(1)
  const [drawCountInput, setDrawCountInput] = useState('1')
  const [drawnCards, setDrawnCards] = useState<number[]>([])
  const [showCardList, setShowCardList] = useState(false)
  const [showWinningList, setShowWinningList] = useState(false)
  const [showDrawCountInput, setShowDrawCountInput] = useState(false)
  const [showAddCardInput, setShowAddCardInput] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [hoverTooltip, setHoverTooltip] = useState('')
  const nextIdRef = useRef(1)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const draggingCardRef = useRef<number | null>(null)
  const isDraggingStarted = useRef(false)

  const addCard = (title: string) => {
    if (!title.trim()) return

    const newCard = {
      id: nextIdRef.current,
      title: title.trim(),
    }
    const newId = nextIdRef.current

    setAnimatingCards((prev) => new Set(prev).add(newId))
    setCards([...cards, newCard])
    nextIdRef.current++

    setTimeout(() => {
      setAnimatingCards((prev) => {
        const next = new Set(prev)
        next.delete(newId)
        return next
      })
    }, 800)
  }

  const handleAddCard = () => {
    setShowAddCardInput(true)
    setNewCardTitle('')
  }

  const confirmAddCard = () => {
    addCard(newCardTitle)
    setShowAddCardInput(false)
    setNewCardTitle('')
  }

  const deleteCard = (cardId: number) => {
    setCards(cards.filter(card => card.id !== cardId))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.txt')) {
      alert('Please upload a .txt file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.substring(0, 24)) // Limit to 24 characters max

      if (lines.length === 0) return

      // Add all cards at once
      const newCards = lines.map((title, index) => ({
        id: nextIdRef.current + index,
        title: title
      }))

      const newIds = new Set(newCards.map(card => card.id))
      setAnimatingCards((prev) => new Set([...prev, ...newIds]))
      setCards([...cards, ...newCards])
      nextIdRef.current += lines.length

      setTimeout(() => {
        setAnimatingCards((prev) => {
          const next = new Set(prev)
          newIds.forEach(id => next.delete(id))
          return next
        })
      }, 800)
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const randomDraw = () => {
    if (cards.length === 0 || isDrawing) return

    const actualDrawCount = Math.min(drawCount, cards.length)

    setIsDrawing(true)
    setDrawComplete(false)
    setShufflingIndex(0)

    setTimeout(() => {
      // Shuffle animation
      let shuffleCount = 0
      const totalShuffles = 91

      const shuffle = () => {
        if (shuffleCount >= totalShuffles) {
          // Phase 3: Select final cards
          const availableIndices = cards.map((_, idx) => idx)
          const selectedIndices: number[] = []

          for (let i = 0; i < actualDrawCount; i++) {
            const randomIdx = Math.floor(Math.random() * availableIndices.length)
            selectedIndices.push(availableIndices[randomIdx])
            availableIndices.splice(randomIdx, 1)
          }

          const finalIndex = selectedIndices[0]
          setShufflingIndex(finalIndex)
          setDrawnCards(selectedIndices.map(idx => cards[idx].id))

          // Generate scatter positions
          const positions = new Map<number, { x: number; y: number; rotation: number }>()
          const screenWidth = window.innerWidth
          const screenHeight = window.innerHeight * 0.66 // top-section takes 2/3

          // Collect non-winning cards and distribute left/right
          const nonWinningCards: Array<{ card: typeof cards[0]; idx: number }> = []
          cards.forEach((card, idx) => {
            if (!selectedIndices.includes(idx)) {
              nonWinningCards.push({ card, idx })
            }
          })

          // Shuffle and distribute evenly left/right
          const shuffled = [...nonWinningCards].sort(() => Math.random() - 0.5)
          const leftCount = Math.floor(shuffled.length / 2)

          shuffled.forEach((item, i) => {
            const side = i < leftCount ? -1 : 1
            const rotation = (Math.random() - 0.5) * 90
            const distanceToEdge = screenWidth / 2
            const edgeDistance = Math.random() * 120
            const offsetX = side * (distanceToEdge - edgeDistance)
            const offsetY = (Math.random() - 0.5) * screenHeight
            positions.set(item.card.id, { x: offsetX, y: offsetY, rotation })
          })

          setScatterPositions(positions)
          setDrawComplete(true)
          return
        }

        setShufflingIndex(Math.floor(Math.random() * cards.length))
        shuffleCount++

        const progress = shuffleCount / totalShuffles
        const initialDelay = 100
        const finalDelay = 10
        const delay = initialDelay - (initialDelay - finalDelay) * progress

        setTimeout(shuffle, delay)
      }

      shuffle()
    }, 500)
  }

  const returnToNormal = () => {
    setIsDrawing(false)
    setDrawComplete(false)
    setScatterPositions(new Map())
    setDrawnCards([])
    setShowDrawCountInput(false)
  }

  const cardWidth = 200
  const containerWidth = typeof window !== 'undefined' ? window.innerWidth * 0.8 : 1200

  const maxCardsInRow = Math.floor(containerWidth / cardWidth)
  const useFanLayout = cards.length > maxCardsInRow

  const handleMouseDown = (e: React.MouseEvent, cardId: number) => {
    if (animatingCards.has(cardId) || isDrawing || drawComplete) return

    draggingCardRef.current = cardId
    isDraggingStarted.current = false
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    setDragOffset({ x: 0, y: 0 })
  }

  useEffect(() => {
    let rafId: number | null = null
    const dragThreshold = 5

    const handleMouseMove = (e: MouseEvent) => {
      if (draggingCardRef.current === null) return

      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }

      rafId = requestAnimationFrame(() => {
        const deltaX = e.clientX - dragStartPos.current.x
        const deltaY = e.clientY - dragStartPos.current.y

        if (!isDraggingStarted.current) {
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
          if (distance > dragThreshold) {
            isDraggingStarted.current = true
            setDraggingCard(draggingCardRef.current)
          }
        }

        if (isDraggingStarted.current) {
          setDragOffset({ x: deltaX, y: deltaY })
        }
        rafId = null
      })
    }

    const handleMouseUp = () => {
      if (draggingCardRef.current === null) return

      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }

      setDragOffset({ x: 0, y: 0 })
      setDraggingCard(null)
      draggingCardRef.current = null
      isDraggingStarted.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const getCardStyle = (index: number, total: number, isNew: boolean, cardId: number) => {
    let offsetX: number
    let rotation: number

    if (isDrawing || drawComplete) {
      if (drawComplete) {
        const isWinning = drawnCards.includes(cardId)

        if (isWinning) {
          const winningIndex = drawnCards.indexOf(cardId)
          const totalWinning = drawnCards.length
          const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
          const centerAreaWidth = screenWidth * 0.5 // Center 50% area
          const cardWidth = 200
          const spacing = 220

          const totalWidth = totalWinning * spacing
          const useFanLayout = totalWidth > centerAreaWidth

          let offsetX: number
          let rotation: number

          if (useFanLayout) {
            const centerIndex = (totalWinning - 1) / 2
            const maxRotation = 20
            rotation = ((winningIndex - centerIndex) / totalWinning) * maxRotation

            const maxSpread = centerAreaWidth - cardWidth
            const offsetPerCard = totalWinning > 1 ? maxSpread / (totalWinning - 1) : 0
            offsetX = (winningIndex - centerIndex) * offsetPerCard
          } else {
            offsetX = (winningIndex - (totalWinning - 1) / 2) * spacing
            rotation = 0
          }

          const style: any = {
            transform: `translateX(${offsetX}px) translateY(0px) rotate(${rotation}deg)`,
            zIndex: 10000 + winningIndex,
            transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            '--hover-x': `${offsetX}px`,
          }
          return style
        } else {
          const scatterPos = scatterPositions.get(cardId)
          if (scatterPos) {
            const style: any = {
              transform: `translateX(${scatterPos.x}px) translateY(${scatterPos.y}px) rotate(${scatterPos.rotation}deg)`,
              zIndex: total - index,
              transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
              opacity: 0.6,
              '--hover-x': `${scatterPos.x}px`,
            }
            return style
          }
        }
      }

      offsetX = 0
      rotation = 0

      const style: any = {
        transform: `translateX(0px) translateY(0px) rotate(0deg)`,
        zIndex: shufflingIndex === index ? 10000 : total - index,
        transition: 'transform 0.5s ease, z-index 0s',
      }

      return style
    }

    if (!useFanLayout) {
      const minGap = 5 // Minimum gap
      const maxGap = 20 // Maximum gap
      const totalCardsWidth = total * cardWidth
      const availableSpace = containerWidth - totalCardsWidth
      const calculatedGap = Math.max(minGap, Math.min(maxGap, availableSpace / (total - 1)))

      const totalWidth = total * cardWidth + (total - 1) * calculatedGap
      const startX = -totalWidth / 2 + cardWidth / 2
      offsetX = startX + index * (cardWidth + calculatedGap)
      rotation = 0
    } else {
      const maxRotation = 30
      const centerIndex = (total - 1) / 2

      rotation = ((index - centerIndex) / total) * maxRotation
      const rotationRad = (Math.abs(rotation) * Math.PI) / 180
      const cardEffectiveWidth = cardWidth * Math.cos(rotationRad) + 280 * Math.sin(rotationRad)
      const maxSpread = containerWidth - cardEffectiveWidth
      const offsetPerCard = total > 1 ? maxSpread / (total - 1) : 0

      offsetX = (index - centerIndex) * offsetPerCard
    }

    const isDragging = draggingCard === cardId
    const finalX = isDragging ? offsetX + dragOffset.x : offsetX
    const finalY = isDragging ? dragOffset.y : 0
    const finalRotation = isDragging ? 0 : rotation

    const style: any = {
      transform: `translateX(${finalX}px) translateY(${finalY}px) rotate(${finalRotation}deg)`,
      zIndex: isDragging ? 10000 : index,
      '--hover-x': `${offsetX}px`,
      transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }

    if (isNew) {
      style['--final-x'] = `${offsetX}px`
      style['--final-rotation'] = `${rotation}deg`
    }

    return style
  }

  return (
    <div className="container">
      <div className="top-section">
        <div className="card-container">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className={`card-wrapper ${animatingCards.has(card.id) ? 'card-new' : ''} ${draggingCard === card.id ? 'dragging' : ''} ${isDrawing || drawComplete ? 'drawing-mode' : ''} ${drawComplete ? 'draw-complete' : ''} ${drawComplete && drawnCards.includes(card.id) ? 'winning-card' : ''}`}
              style={getCardStyle(index, cards.length, animatingCards.has(card.id), card.id)}
              onMouseDown={(e) => handleMouseDown(e, card.id)}
            >
              <Card title={card.title} number={index + 1} />
            </div>
          ))}
        </div>
        {!isDrawing && !drawComplete && (
          <button className="card-list-button" onClick={() => setShowCardList(true)}>
            <span className="material-symbols-outlined">list</span>
          </button>
        )}
        {drawComplete && (
          <button className="card-list-button" onClick={() => setShowWinningList(true)}>
            <span className="material-symbols-outlined">list</span>
          </button>
        )}
      </div>
      <div className="divider"></div>
      <div className="bottom-section">
        <label
          className={`upload-button ${isDrawing || drawComplete ? 'disabled' : ''}`}
          onMouseEnter={() => !isDrawing && !drawComplete && setHoverTooltip('Upload .txt file where each line represents an item.')}
          onMouseLeave={() => setHoverTooltip('')}
        >
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            disabled={isDrawing || drawComplete}
          />
          <span className="material-symbols-outlined">upload_file</span>
        </label>
        <button
          className="add-button"
          onClick={handleAddCard}
          disabled={isDrawing || drawComplete}
        >
          Add Card
        </button>
        {!drawComplete ? (
          <>
            <button
              className="draw-button"
              onClick={randomDraw}
              disabled={cards.length <= 1 || isDrawing}
            >
              {isDrawing ? 'Drawing...' : 'Random Draw'}
            </button>
            <button
              className="edit-button"
              onClick={() => {
                setDrawCountInput(drawCount.toString())
                setShowDrawCountInput(true)
              }}
              disabled={isDrawing || cards.length <= 1}
              onMouseEnter={() => setHoverTooltip('Set draw count')}
              onMouseLeave={() => setHoverTooltip('')}
            >
              <span className="material-symbols-outlined">edit</span>
            </button>
          </>
        ) : (
          <button
            className="return-button"
            onClick={returnToNormal}
          >
            Return
          </button>
        )}
      </div>

      {hoverTooltip && (
        <div className="bottom-tooltip">
          {hoverTooltip}
        </div>
      )}

      {showCardList && (
        <div className="modal-overlay" onClick={() => setShowCardList(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Card List</h2>
              <button className="modal-close" onClick={() => setShowCardList(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <ul className="card-list">
                {cards.map((card, index) => (
                  <li key={card.id} className="card-list-item">
                    <span className="card-list-number">{index + 1}</span>
                    <span className="card-list-title">{card.title}</span>
                    <button
                      className="card-list-delete"
                      onClick={() => deleteCard(card.id)}
                      title="Delete"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {showWinningList && (
        <div className="modal-overlay" onClick={() => setShowWinningList(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Winning List</h2>
              <button className="modal-close" onClick={() => setShowWinningList(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <ul className="card-list">
                {drawnCards.map((cardId) => {
                  const card = cards.find(c => c.id === cardId)
                  const index = cards.findIndex(c => c.id === cardId)
                  return card ? (
                    <li key={card.id} className="card-list-item">
                      <span className="card-list-number">{index + 1}</span>
                      <span className="card-list-title">{card.title}</span>
                    </li>
                  ) : null
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {showDrawCountInput && (
        <div className="modal-overlay" onClick={() => setShowDrawCountInput(false)}>
          <div className="draw-count-modal" onClick={(e) => e.stopPropagation()}>
            <div className="draw-count-modal-header">
              <h3>Set Draw Count</h3>
              <button className="modal-close" onClick={() => setShowDrawCountInput(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="draw-count-modal-body">
              <input
                type="number"
                min="1"
                max={cards.length}
                value={drawCountInput}
                onChange={(e) => setDrawCountInput(e.target.value)}
                placeholder="Enter draw count"
                autoFocus
              />
            </div>
            <div className="draw-count-modal-footer">
              <button className="draw-count-cancel" onClick={() => {
                setDrawCountInput(drawCount.toString())
                setShowDrawCountInput(false)
              }}>
                Cancel
              </button>
              <button className="draw-count-confirm" onClick={() => {
                const newCount = parseInt(drawCountInput) || 1
                const validCount = Math.max(1, Math.min(cards.length, newCount))
                setDrawCount(validCount)
                setDrawCountInput(validCount.toString())
                setShowDrawCountInput(false)
              }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCardInput && (
        <div className="modal-overlay" onClick={() => setShowAddCardInput(false)}>
          <div className="draw-count-modal" onClick={(e) => e.stopPropagation()}>
            <div className="draw-count-modal-header">
              <h3>Add Card</h3>
              <button className="modal-close" onClick={() => setShowAddCardInput(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="draw-count-modal-body">
              <input
                type="text"
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value.substring(0, 24))}
                placeholder="Enter card title"
                maxLength={24}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCardTitle.trim()) {
                    confirmAddCard()
                  }
                }}
              />
            </div>
            <div className="draw-count-modal-footer">
              <button className="draw-count-cancel" onClick={() => setShowAddCardInput(false)}>
                Cancel
              </button>
              <button
                className="draw-count-confirm"
                onClick={confirmAddCard}
                disabled={!newCardTitle.trim()}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
