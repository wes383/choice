import './Card.css'

interface CardProps {
  title: string
  number?: number
}

function Card({ title, number }: CardProps) {
  return (
    <div className="card">
      {number && <span className="card-number">{number}</span>}
      <h2 className="card-title">{title}</h2>
    </div>
  )
}

export default Card
