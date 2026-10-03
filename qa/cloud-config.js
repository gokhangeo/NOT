window.CEPTE_CLOUD={testOnly:true};
if(!localStorage.getItem('cepte_not_qa_notes_v4')){
const today=new Date(),day=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),old=new Date(today);old.setDate(old.getDate()-3);
const make=(id,title,more={})=>({id,title,content:'Türkçe açıklama ve MERSİN iş takibi',category:'İş',priority:'orta',completed:false,subTasks:[],alarmAt:null,alarmTriggered:false,createdAt:today.toISOString(),updatedAt:today.toISOString(),...more});
localStorage.setItem('cepte_not_qa_notes_v4',JSON.stringify([make('fixture1','Bugünkü deneme işi',{dueDate:day(today)}),make('fixture2','Geciken deneme işi',{dueDate:day(old),priority:'yüksek'}),make('fixture3','Bekleyen deneme işi',{status:'Bekliyor',waitingFor:'Deneme Birimi',checkDate:day(today)}),make(1234.5,'Eski v4 tarihsiz not',{subTasks:[{text:'Ölçüm yap',completed:false}]})]));
}