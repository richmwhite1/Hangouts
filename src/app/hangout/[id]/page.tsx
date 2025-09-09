export default function HangoutDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="container">
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">Hangout Details</h1>
        <p className="text-gray-600 mb-4">
          This is a placeholder hangout detail page for ID: {params.id}. Ready for your custom design integration.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-semibold mb-2">Hangout Info</h3>
            <p className="text-gray-600">Title, description, location, time</p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Participants</h3>
            <p className="text-gray-600">Who's attending and RSVP status</p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Polls & Voting</h3>
            <p className="text-gray-600">Consensus voting and decision making</p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Chat</h3>
            <p className="text-gray-600">Real-time messaging and updates</p>
          </div>
        </div>
        <div className="mt-4 flex space-x-4">
          <a href={`/hangout/${params.id}/chat`} className="btn btn-primary">Open Chat</a>
          <button className="btn">RSVP</button>
        </div>
      </div>
    </div>
  )
}