export function GET() {
  const configured = Boolean(process.env.SARVAM_API_KEY);
  return Response.json(
    {
      ok: configured,
      service: "artery-voice-relay",
      paths: ["/stt", "/tts"],
    },
    { status: configured ? 200 : 503 },
  );
}
