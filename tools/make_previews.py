from PIL import Image, ImageDraw, ImageFont
O='art/'; P='previews/'
def bg(w,h):
    im=Image.open(O+'arena_back.jpg').convert('RGB').resize((w,h)); return Image.blend(im, Image.new('RGB',(w,h),(30,14,40)), 0.55)
try: F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',34)
except: F=ImageFont.load_default()
for who,label in [('hakeem','Hakeem "The Dream" Olajuwon  #34'),('clyde','Clyde "The Glide" Drexler  #22')]:
    W,H=1500,900; c=bg(W,H); x=90
    for p in ['ready','shoot','cheer']:
        s=Image.open(O+f'{who}_{p}.png'); c.paste(s,(x,110),s); x+=s.width+150
    d=ImageDraw.Draw(c); d.text((40,30),label,font=F,fill=(255,236,200))
    c.save(P+f'{who}_character.png'); print(P+f'{who}_character.png')
# arena preview: backdrop + court + hoop composite sketch
W,H=1600,900; c=Image.open(O+'arena_back.jpg').convert('RGB').resize((W,H))
c.save(P+'arena_backdrop.png')
Image.open(O+'arena_wide.jpg').save(P+'arena_wide.png')
# logos
W,H=1600,700; c=bg(W,H); l=Image.open(O+'logo.png'); c.paste(l,(40,(H-l.height)//2),l)
cr=Image.open(O+'crest.png'); c.paste(cr,(1040,(H-cr.height)//2),cr); c.save(P+'logos.png')
# props
W,H=1500,700; c=bg(W,H); h=Image.open(O+'hoop.png'); c.paste(h,(40,30),h); r=Image.open(O+'rack.png'); c.paste(r,(720,260),r)
for i,n in enumerate(['ball','moneyball']):
    b=Image.open(O+n+'.png'); c.paste(b,(780+i*220,60),b)
c.save(P+'props.png')
co=Image.open(O+'court.jpg').resize((700,700)); co.save(P+'court_floor.png')
print('ok')
