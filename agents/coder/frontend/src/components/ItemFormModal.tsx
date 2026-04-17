import { useState } from 'react';

export default function ItemFormModal({ onSubmit }: { onSubmit: (item: { name: string, description?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <>
      <button style={{margin:8}} onClick={()=>setOpen(true)}>Ajouter un item</button>
      {open && (
        <div style={{position:'fixed',top:40,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.25)',zIndex:50,display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:12,padding:28,minWidth:320,boxShadow:'0 4px 12px #0002',marginTop:40}}>
            <h3>Nouvel Item</h3>
            <form onSubmit={e=>{e.preventDefault(); onSubmit({name,description:desc}); setOpen(false);}}>
              <input type="text" required value={name} onChange={e=>setName(e.target.value)} placeholder="Nom" style={{marginBottom:10, width:'100%'}} /><br/>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description" style={{width:'100%',height:56}} /><br/>
              <button type="submit">Enregistrer</button>
              <button type="button" onClick={()=>setOpen(false)} style={{marginLeft:10}}>Annuler</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
