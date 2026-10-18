const r1 = await fetch('http://localhost:3000/');
const html1 = await r1.text();
console.log('Homepage status:', r1.status);
console.log('Homepage includes brand:', html1.includes('AZAROTH'));
console.log('Homepage includes nav shell:', html1.includes('class="nav"'));
console.log('Homepage includes hero section:', html1.includes('class="hero"'));
console.log('Homepage has NO crude 150px div:', !html1.includes('margin:150px auto'));

const r2 = await fetch('http://localhost:3000/admin');
const html2 = await r2.text();
console.log('Admin status:', r2.status);
console.log('Admin includes sign in card:', html2.includes('Secure administrator sign in'));
console.log('Admin has NO crude 150px div:', !html2.includes('margin:150px auto'));

const r3 = await fetch('http://localhost:3000/api/content');
const content = await r3.json();
console.log('API content status:', r3.status);
console.log('API content brand:', content.brand);
console.log('API content productStatusColors:', content.productStatusColors);
