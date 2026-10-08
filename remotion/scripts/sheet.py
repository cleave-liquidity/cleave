import sys
from PIL import Image
# usage: python3 scripts/sheet.py out/sheet.png 44 56 66 ...
name=sys.argv[1]; frames=[int(x) for x in sys.argv[2:]]
ims=[Image.open(f"out/f{f:03d}.png").convert("RGB") for f in frames]
cols=2; w,h=ims[0].size; rows=(len(ims)+cols-1)//cols
out=Image.new("RGB",(w*cols,h*rows))
for i,im in enumerate(ims): out.paste(im,((i%cols)*w,(i//cols)*h))
out.save(name); print(name,out.size)
