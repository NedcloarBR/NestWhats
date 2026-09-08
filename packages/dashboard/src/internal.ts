/**
 * Internals reached by the test suite.
 *
 * Adding `exports` to package.json sealed deep paths like
 * `@nestwhats/dashboard/dist/dashboard.html`, which is the point — nobody
 * should build against them. This subpath is the one documented door, mirroring
 * what `@nestjs/common/internal` does: it is not covered by semver and may
 * change or disappear in a patch release.
 */
export { getDashboardHtml } from "./dashboard.html.js";
