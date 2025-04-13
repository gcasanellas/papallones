d3.csv("data2.csv").then(data => {
  const root = { name: "Specimen", children: [] };

  data.forEach(d => {
    const classificacio = d.higherClassification.split(";").map(s => s.trim());
    const link = (d["associatedMedia.identifier"] || "").split("|")[0]?.trim();
    const nom = `${d._id} ${d.determinationNames}`;
    
    let actual = root;
    classificacio.forEach(nivell => {
      let fill = actual.children.find(c => c.name === nivell);
      if (!fill) {
        fill = { name: nivell, children: [] };
        actual.children.push(fill);
      }
      actual = fill;
    });

    actual.children.push({
      name: nom,
      link: link,
    });
  });

  // Convertim a jerarquia D3 i ocultem fills per defecte
  const d3Root = d3.hierarchy(root);
  d3Root.children.forEach(collapseRecursivamentPenultim);

  dibuixaInteractivament(d3Root);
});

// Funció per col·lapsar nodes a partir del penúltim nivell
function collapseRecursivamentPenultim(node) {
  if (node.children) {
    node.children.forEach(collapseRecursivamentPenultim);
    if (node.depth >= 2) {  // penúltim nivell comença a depth 2 (arrel = 0)
      node._children = node.children;
      node.children = null;
    }
  }
}

function dibuixaInteractivament(root) {
  const width = 900;
  const radius = width / 2;

  const tree = d3.tree()
    .size([2 * Math.PI, radius - 100])
    .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

  const svg = d3.select("svg")
    .attr("viewBox", [-width / 2, -width / 2, width, width]);

  const gLink = svg.append("g");
  const gNode = svg.append("g");

  function update(source) {
    tree(root);

    const links = root.links();
    const nodes = root.descendants();

    gLink.selectAll("path")
      .data(links)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("d", d3.linkRadial()
        .angle(d => d.x)
        .radius(d => d.y)
      );

    const node = gNode.selectAll("g")
      .data(nodes, d => d.data.name)
      .join(enter => {
        const g = enter.append("g")
          .attr("transform", d => `
            rotate(${d.x * 180 / Math.PI - 90})
            translate(${d.y},0)
          `)
          .style("cursor", "pointer")
          .on("click", (event, d) => {
            if (d.children) {
              d._children = d.children;
              d.children = null;
            } else {
              d.children = d._children;
              d._children = null;
            }
            update(d);
          });

        g.append("circle")
          .attr("r", 4)
          .attr("fill", d => d.children || d._children ? "#555" : "#999");

        g.append("a")
          .attr("xlink:href", d => d.data.link || null)
          .attr("target", "_blank")
          .append("text")
          .attr("dy", "0.31em")
          .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
          .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
          .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
          .text(d => d.data.name)
          .style("font", "11px sans-serif")
          .clone(true).lower()
          .attr("stroke", "white");

        return g;
      })
      .attr("transform", d => `
        rotate(${d.x * 180 / Math.PI - 90})
        translate(${d.y},0)
      `);
  }

  update(root);
}
