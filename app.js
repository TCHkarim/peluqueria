/* Cambiá el número por el WhatsApp del salón si es distinto. Formato: país + área + número, solo dígitos. */
const WHATSAPP_NUMBER='5493512065139';
const SERVICES=['Corte & brushing','Coloración','Mechas y balayage','Tratamiento capilar','Peinado para evento','Necesito asesoramiento'];
const TIMES=['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30'];
const $=s=>document.querySelector(s);
const dateInput=$('#dateInput');
const localDate=new Date();dateInput.min=new Date(localDate.getTime()-localDate.getTimezoneOffset()*60000).toISOString().slice(0,10);
$('#timeSelect').innerHTML='<option value="" disabled selected>Elegí un horario</option>'+TIMES.map(time=>`<option value="${time}">${time}</option>`).join('');
$('#year').textContent=new Date().getFullYear();
function openWhatsApp(message=''){const number=WHATSAPP_NUMBER.replace(/\D/g,'');if(!number){showToast('Configurá el WhatsApp del salón en app.js');return}window.open(`https://wa.me/${number}${message?'?text='+encodeURIComponent(message):''}`,'_blank','noopener,noreferrer')}
function showToast(message){const toast=$('#toast');toast.textContent=message;toast.classList.add('show');window.clearTimeout(showToast.timer);showToast.timer=window.setTimeout(()=>toast.classList.remove('show'),3200)}
function localDateLabel(value){if(!value)return '';const [year,month,day]=value.split('-').map(Number);return new Intl.DateTimeFormat('es-AR',{weekday:'long',day:'numeric',month:'long'}).format(new Date(year,month-1,day))}
document.querySelectorAll('[data-book-service]').forEach(button=>button.addEventListener('click',()=>{$('#serviceSelect').value=button.dataset.bookService;$('#turnos').scrollIntoView({behavior:'smooth'});window.setTimeout(()=>$('#dateInput').focus({preventScroll:true}),500)}));
$('#bookingForm').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const data=new FormData(form);const service=data.get('service'),date=data.get('date'),time=data.get('time'),name=String(data.get('name')).trim(),phone=String(data.get('phone')).trim(),notes=String(data.get('notes')).trim();if(!SERVICES.includes(service)){showToast('Elegí un servicio para continuar');return}const message=['Hola, quiero solicitar un turno en Lúmina Estudio.','',`Servicio: ${service}`,`Día preferido: ${localDateLabel(date)}`,`Horario aproximado: ${time}`,`Nombre: ${name}`,`Mi WhatsApp: ${phone}`,...(notes?[`Quiero contarte: ${notes}`]:[]),'','¿Me confirman disponibilidad y el valor del servicio?'].join('\n');openWhatsApp(message)});
function setMenu(open){$('#mainNav').classList.toggle('open',open);$('#menuToggle').setAttribute('aria-expanded',String(open));$('#menuToggle').setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');document.body.classList.toggle('menu-open',open)}
$('#menuToggle').addEventListener('click',()=>setMenu($('#menuToggle').getAttribute('aria-expanded')!=='true'));
document.querySelectorAll('#mainNav a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));
document.addEventListener('keydown',event=>{if(event.key==='Escape')setMenu(false)});
const whatsappText=encodeURIComponent('Hola, quisiera consultar por los servicios y turnos de Lúmina Estudio.');const whatsappUrl=`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappText}`;['#bookingWhatsApp','#floatingWhatsApp'].forEach(selector=>$(selector).href=whatsappUrl);
