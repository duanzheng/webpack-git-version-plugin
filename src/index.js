import simpleGit from 'simple-git';

class WebpackVersionPlugin {
  constructor(options = {}) {
    this.processor = options.processor;
  }

  validateFile(fileName) {
    return /\.js$|\.css$/.test(fileName);
  }

  gitHashTextGenerator(fileName, originalGitHash) {
    let gitHash = originalGitHash;
    if (this.processor && typeof this.processor === 'function') {
      const processResult = this.processor(gitHash);
      gitHash =
        processResult !== undefined && processResult !== null
          ? this.processor(gitHash)
          : gitHash;
    }
    if (fileName.endsWith('.js')) {
      gitHash = `// ${gitHash}`;
    } else if (fileName.endsWith('.css')) {
      gitHash = `/* ${gitHash} */`;
    }
    return gitHash;
  }

  apply(compiler) {
    compiler.hooks.emit.tapPromise('FileVersionPlugin', async (compilation) => {
      const git = simpleGit();
      const gitlog = await git.log();
      if (!gitlog) {
        return;
      }
      Object.keys(compilation.assets).forEach((fileName) => {
        if (!this.validateFile(fileName)) {
          return;
        }
        const gitHashText = this.gitHashTextGenerator(
          fileName,
          gitlog.latest.hash,
        );
        let fileContent = compilation.assets[fileName].source();
        fileContent = `${fileContent}\n${gitHashText}`;
        compilation.assets[fileName] = {
          source() {
            return fileContent;
          },
          size() {
            return fileContent.length;
          },
        };
      });
    });
  }
}

export default WebpackVersionPlugin;
