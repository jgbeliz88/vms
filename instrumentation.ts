import { Tracer } from '@mediaset/tracer';

export async function register() {
  new Tracer().init();
}
