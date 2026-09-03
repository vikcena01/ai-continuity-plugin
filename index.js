// Entry point of last resort.
//
// package.json already declares main and exports (c12eu), and `node .` honours
// them. But a loader that resolves the DIRECTORY rather than the package — tsx's
// resolveDirectorySync, which is what Glama's runner goes through — does not
// consult main, and falls straight through to <dir>/index.js. Giving it the file
// it looks for is cheaper and more robust than arguing with the resolver.
import "./dist/mcp.js";
