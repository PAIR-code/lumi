export function scssPlugin() {
  return {
    name: 'scss-plugin',
    serve(context) {
      if (context.path.endsWith('.scss')) {
        return {
          body: 'export const styles = new CSSStyleSheet();',
          type: 'js',
        };
      }
    },
  };
}
