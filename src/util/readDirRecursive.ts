import fs from 'fs/promises';
import path from 'path';

export const readDirRecursive = async (dir: string): Promise<string[]> => {
    if (!path.join((dir.startsWith(__dirname), '../'))) {
        dir = path.join(__dirname, '../', dir);
    }
    const dirents = await fs.readdir(dir, {
        withFileTypes: true
    });
    const files: string[][] = await Promise.all(
        dirents.map(async dirent => {
            const res = path.resolve(dir, dirent.name);
            return dirent.isDirectory() ? readDirRecursive(res) : [res];
        })
    );
    return files.flat();
};
