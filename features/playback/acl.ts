// Shared CDN ACL path builders.
//
// These produce the path segment passed as the second argument to `buildCdnAcl`
// (see features/playback/hooks.ts), which folds in the CDN settings URL's pathname
// (e.g. the "/staging" extra-path). Keeping the templates here means Live, VOD and
// Fast-Channels playback panels and the CDN Token Generation page all build ACLs
// identically.

export function liveAclPath(linearName: string): string {
  return `/ori${linearName}/live/${linearName}/*`;
}

export function vodAclPath(encoder: string, uuid: string): string {
  const encoderSegment = encoder ? `/${encoder}` : "";
  const seg1 = uuid.slice(0, 2);
  const seg2 = uuid.slice(2, 4);
  return `/orivod/vod${encoderSegment}/${seg1}/${seg2}/${uuid}/*`;
}

export function fastAclPath(channelName: string): string {
  return `/${channelName}.isml/*`;
}
