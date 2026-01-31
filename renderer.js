/* ==========================================================================
   UltraTextGen — renderer.js
   Handles ALL text rendering based on style.type
   ========================================================================== */

(function () {

  /* -----------------------------
     MAP RENDERER
     ----------------------------- */
  function renderMap(text, style) {
    if (!text) return '';

    const normalUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const normalLower = 'abcdefghijklmnopqrstuvwxyz';
    const normalNums  = '0123456789';

    const upperArr = [...style.upper];
    const lowerArr = [...style.lower];
    const numsArr  = [...style.nums];

    return [...text].map(char => {
      const u = normalUpper.indexOf(char);
      if (u !== -1) return upperArr[u] || char;

      const l = normalLower.indexOf(char);
      if (l !== -1) return lowerArr[l] || char;

      const n = normalNums.indexOf(char);
      if (n !== -1) return numsArr[n] || char;

      return char;
    }).join('');
  }

  /* -----------------------------
     DECORATORS
     ----------------------------- */
  const decorators = {
    strike:   t => [...t].map(c => c + '\u0336').join(''),
    underline:t => [...t].map(c => c + '\u0332').join(''),
    wavy:    t => [...t].map((c,i)=> c + (i%2===0 ? '\u0303':'' )).join(''),
    slash:   t => [...t].map(c => c + '\u0338').join('')
  };

  function renderDecorator(text, style) {
    if (!text) return '';
    const fn = decorators[style.decoratorId];
    return fn ? fn(text) : text;
  }

  /* -----------------------------
     PROCEDURES
     ----------------------------- */
  const procedures = {
    'alternating-bold': text =>
      [...text].map((c,i)=> i%2===0 ? renderMap(c, textStyles['Ultra Bold']) : c).join(''),

    'alternating-italic': text =>
      [...text].map((c,i)=> i%2===0 ? renderMap(c, textStyles['Ultra Italic']) : c).join(''),

    'bold-alternating-italic': text =>
      [...text].map((c,i)=> i%2===0
        ? renderMap(c, textStyles['Ultra Bold'])
        : renderMap(c, textStyles['Ultra Italic'])
      ).join(''),

    'italic-switch-serifs': text =>
      [...text].map((c,i)=> i%2===0
        ? renderMap(c, textStyles['Ultra Italic'])
        : renderMap(c, textStyles['Ultra Italic Serif'])
      ).join('')
  };

  function renderProcedure(text, style) {
    if (!text) return '';
    const fn = procedures[style.procedureId];
    return fn ? fn(text) : text;
  }

  /* -----------------------------
     MASTER SWITCH
     ----------------------------- */
  function renderAny(text, style) {
    switch (style.type) {
      case 'map':
        return renderMap(text, style);
      case 'decorator':
        return renderDecorator(text, style);
      case 'procedure':
        return renderProcedure(text, style);
      default:
        return renderMap(text, style); // fallback
    }
  }

  /* -----------------------------
     EXPOSE GLOBAL
     ----------------------------- */
  window.UltraTextGenRender = {
    renderAny
  };

})();
