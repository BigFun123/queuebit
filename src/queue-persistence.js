// @ts-check
const fs = require('fs');
const path = require('path');

class QueuePersistence {
  /**
   * @param {{ directory?: string, fileName?: string }} [options={}] - Persistence options
   */
  constructor(options = {}) {
    this.directory = options.directory || process.cwd();
    this.fileName = options.fileName || 'queue.jsonl';
    this.filePath = path.join(this.directory, this.fileName);
    this._pendingSnapshot = null;
    this._isWriting = false;

    fs.mkdirSync(this.directory, { recursive: true });
  }

  /**
   * @returns {Array<Record<string, any>>} Loaded messages from disk
   */
  loadQueue() {
    if (!fs.existsSync(this.filePath)) {
      return [];
    }

    const content = fs.readFileSync(this.filePath, 'utf8');
    if (!content.trim()) {
      return [];
    }

    const lines = content.split(/\r?\n/);
    /** @type {Array<Record<string, any>>} */
    const messages = [];

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object') {
          messages.push(parsed);
        }
      } catch (_) {
        // Skip malformed lines to avoid blocking startup.
      }
    }

    return messages;
  }

  /**
   * @param {Map<string, Array<Record<string, any>>>} messagesBySubject - Subject map to persist
   */
  requestSave(messagesBySubject) {
    this._pendingSnapshot = this._serialize(messagesBySubject);

    if (this._isWriting) {
      return;
    }

    this._isWriting = true;
    void this._flushLoop();
  }

  /**
   * @param {Map<string, Array<Record<string, any>>>} messagesBySubject - Subject map to persist
   */
  forceSaveSync(messagesBySubject) {
    const snapshot = this._serialize(messagesBySubject);
    this._writeSnapshotSync(snapshot);
  }

  async _flushLoop() {
    while (this._pendingSnapshot) {
      const snapshot = this._pendingSnapshot;
      this._pendingSnapshot = null;
      await this._writeSnapshot(snapshot);
    }

    this._isWriting = false;
  }

  /**
   * @param {Map<string, Array<Record<string, any>>>} messagesBySubject - Subject map
   * @returns {Array<Record<string, any>>} Flat snapshot list
   */
  _serialize(messagesBySubject) {
    /** @type {Array<Record<string, any>>} */
    const snapshot = [];

    for (const queue of messagesBySubject.values()) {
      for (const message of queue) {
        snapshot.push({
          id: message.id,
          data: message.data,
          subject: message.subject,
          timestamp: message.timestamp,
          expiry: message.expiry,
          removeAfterRead: message.removeAfterRead,
          priority: message.priority || 0,
          sequence: message.sequence || 0
        });
      }
    }

    return snapshot;
  }

  /**
   * @param {Array<Record<string, any>>} snapshot - Messages to write
   */
  async _writeSnapshot(snapshot) {
    const tempPath = `${this.filePath}.tmp`;
    const payload = snapshot.map(item => JSON.stringify(item)).join('\n');

    try {
      await fs.promises.writeFile(tempPath, payload ? `${payload}\n` : '', 'utf8');
      await fs.promises.rename(tempPath, this.filePath);
    } catch (_) {
      // Persistence should not crash the server; keep running on write errors.
    }
  }

  /**
   * @param {Array<Record<string, any>>} snapshot - Messages to write
   */
  _writeSnapshotSync(snapshot) {
    const tempPath = `${this.filePath}.tmp`;
    const payload = snapshot.map(item => JSON.stringify(item)).join('\n');

    try {
      fs.writeFileSync(tempPath, payload ? `${payload}\n` : '', 'utf8');
      fs.renameSync(tempPath, this.filePath);
    } catch (_) {
      // Ignore sync persistence errors during shutdown.
    }
  }
}

module.exports = { QueuePersistence };
