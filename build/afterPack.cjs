// When building the Windows app on Linux/macOS (no wine), set the exe icon and version info with resedit.
const path = require('path');
const fs = require('fs');
exports.default = async function afterPack(ctx) {
  if (ctx.electronPlatformName !== 'win32' || process.platform === 'win32') return;
  const ResEdit = await import('resedit');
  const R = ResEdit.default || ResEdit;
  const exe = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.exe`);
  const data = fs.readFileSync(exe);
  const exeObj = R.NtExecutable.from(data, { ignoreCert: true });
  const res = R.NtExecutableResource.from(exeObj);
  const iconFile = R.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'icon.ico')));
  R.Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, 1033, iconFile.icons.map((i) => i.data));
  const vi = R.Resource.VersionInfo.fromEntries(res.entries)[0];
  if (vi) {
    const v = ctx.packager.appInfo.version.split('.').map(Number);
    vi.setFileVersion(v[0], v[1], v[2], 0, 1033);
    vi.setProductVersion(v[0], v[1], v[2], 0, 1033);
    vi.setStringValues({ lang: 1033, codepage: 1200 }, {
      FileDescription: 'IBRA PENGUINS', ProductName: 'IBRA PENGUINS', CompanyName: 'IBRAPROGRAM',
      LegalCopyright: '© Ibrahim Al-Khazraji', OriginalFilename: 'IBRA PENGUINS.exe', InternalName: 'IBRA PENGUINS',
    });
    vi.outputToResourceEntries(res.entries);
  }
  res.outputResource(exeObj);
  fs.writeFileSync(exe, Buffer.from(exeObj.generate()));
  console.log('  • exe icon + version info set with resedit');
};
