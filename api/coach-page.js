export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    coach: 'coach-estrategico-v1',
    page: '/coach-estrategico.html',
    status: 'ready'
  });
}
