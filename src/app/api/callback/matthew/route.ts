export async function POST() {
  return Response.json(
    { error: "Matthew callbacks have been retired" },
    { status: 410 },
  );
}
