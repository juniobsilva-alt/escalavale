import { estadoVazio } from '../utils.js';

export function renderAjanas(el) {
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Escala de Ajanãs</h1><p>Estrutura criada com dados próprios. Implementação em seguida.</p></div>
    </div>
    ${estadoVazio({
      icone: '☾',
      titulo: 'Em construção',
      descricao: 'A escala de Ajanãs terá grade, trabalhos, horários e disponibilidade próprios, separados dos dirigentes.',
    })}`;
}
