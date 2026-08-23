/** `ffprobe-static` no publica tipos propios. */
declare module 'ffprobe-static' {
  const ffprobe: { path: string };
  export default ffprobe;
}
