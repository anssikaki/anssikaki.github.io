const form    = document.getElementById('upload-form');
const input   = document.getElementById('file-input');
const preview = document.getElementById('preview');
const chartEl = document.getElementById('chart');
const loading = document.getElementById('loading');
const controls= document.getElementById('controls');
const pngBtn  = document.getElementById('png-btn');
const csvBtn  = document.getElementById('csv-btn');
const waShare = document.getElementById('wa-share');
const tooltip = document.getElementById('tooltip');
let fileDataUrl = '';
let chartData   = null;

input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        fileDataUrl = reader.result;
        preview.src = fileDataUrl;
        preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!fileDataUrl) return;

    loading.classList.remove('hidden');
    chartEl.innerHTML = '';
    controls.classList.add('hidden');

    try {
        const res = await fetch('https://anssi-openai-gateway.azurewebsites.net/api/http_trigger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': 'qQGNldzEhrEKBq8v4HRBRs2eKRgVu27h'
            },
            body: JSON.stringify({
                system_prompt: 'You are a helpful assistant that extracts axis labels and data points from hand-drawn charts. Respond with JSON of the form {"x_axis":"","y_axis":"","curves":[{"label":"","points":[{"x":0,"y":0}]}]}',
                user_input: 'Extract axis labels and a list of (x, y) points for each curve in this image.',
                image_url: fileDataUrl
            })
        });

        const text = await res.text();
        if (!res.ok) throw new Error(text);
        let data;
        try {
            data = JSON.parse(text).openai_response;
            data = typeof data === 'string' ? JSON.parse(data) : data;
        } catch {
            throw new Error('Unexpected response');
        }
        chartData = data;
        renderChart(data);
        prepareExports();
    } catch (err) {
        chartEl.textContent = '❌ ' + err.message;
    } finally {
        loading.classList.add('hidden');
    }
});

function renderChart(data) {
    chartEl.innerHTML = '';
    const width = 600;
    const height = 400;
    const margin = {top: 40, right: 20, bottom: 50, left: 60};
    const svg = d3.select('#chart')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const xAll = [];
    const yAll = [];
    data.curves.forEach(c => c.points.forEach(p => { xAll.push(+p.x); yAll.push(+p.y); }));
    const xScale = d3.scaleLinear().domain(d3.extent(xAll)).range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear().domain(d3.extent(yAll)).range([height - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(xAxis);
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(yAxis);

    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 10)
        .attr('text-anchor', 'middle')
        .text(data.x_axis);

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 15)
        .attr('text-anchor', 'middle')
        .text(data.y_axis);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    data.curves.forEach((curve, i) => {
        const line = d3.line()
            .x(d => xScale(+d.x))
            .y(d => yScale(+d.y))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(curve.points)
            .attr('fill', 'none')
            .attr('stroke', color(i))
            .attr('stroke-width', 2)
            .attr('d', line);

        svg.selectAll(`circle.c${i}`)
            .data(curve.points)
            .enter()
            .append('circle')
            .attr('class', `c${i}`)
            .attr('cx', d => xScale(+d.x))
            .attr('cy', d => yScale(+d.y))
            .attr('r', 4)
            .attr('fill', color(i))
            .on('mousemove', (event, d) => {
                tooltip.text(`${curve.label}: (${d.x}, ${d.y})`)
                    .style('left', (event.pageX + 5) + 'px')
                    .style('top', (event.pageY - 28) + 'px')
                    .classed('hidden', false);
            })
            .on('mouseout', () => tooltip.classList.add('hidden'));
    });
}

function prepareExports() {
    if (!chartData) return;
    // Prepare CSV
    let rows = ['curve,label,x,y'];
    chartData.curves.forEach(c => {
        c.points.forEach(p => {
            rows.push(`${c.label},${c.label},${p.x},${p.y}`); // first column repeated for curve label
        });
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    csvBtn.href = URL.createObjectURL(blob);

    // Prepare PNG
    const svg = chartEl.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svg.width.baseVal.value;
        canvas.height = svg.height.baseVal.value;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        pngBtn.href = pngUrl;
        waShare.href = 'https://wa.me/?text=' + encodeURIComponent('Check out my chart from Sketch2Chart!');
    };
    img.src = url;

    controls.classList.remove('hidden');
}

