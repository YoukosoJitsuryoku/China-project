// Размеры для SVG
const width = window.innerWidth;
const height = window.innerHeight;

// Переменные для хранения найденных узлов и текущего индекса
let foundNodes = [];
let currentNodeIndex = 0;

// Переменная для хранения состояния поиска
let isSearchActive = false;
let selectedNode = null; // Переменная для хранения выбранного узла
let button = null; // Переменная для хранения кнопки

// Загрузка данных из baidu.json
d3.json("baidu.json").then(graph => {
    const nodes = graph.nodes.map(node => ({
        id: node.key,
        label: node.attributes.label,
        x: node.attributes.x,
        y: node.attributes.y,
        size: node.attributes.size,
        color: node.attributes.color,
        intersections: node.attributes.intersections || [] // Пересечения узлов
    }));

    const links = graph.links.map(link => ({
        source: link.source,
        target: link.target
    }));

    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);

    const container = svg.append("g");

    const zoom = d3.zoom().scaleExtent([0.5, 10])
        .on("zoom", (event) => {
            container.attr("transform", event.transform); // Зумирование и панорамирование
            updateButtonPosition(); // Обновляем позицию кнопки при зуме
        });

    svg.call(zoom); // Применяем зумирование к SVG

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 3.2, height / 2.5))
        .force("collide", d3.forceCollide().radius(d => d.size + 10))
        .force("x", d3.forceX(width / 2).strength(0.05))
        .force("y", d3.forceY(height / 2).strength(0.05));

    const link = container.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("stroke-width", 2);

    const node = container.append("g")
        .selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("r", d => d.size)
        .attr("fill", d => d.color)
        .on("click", onNodeClick)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    const labels = container.append("g")
        .selectAll("text")
        .data(nodes)
        .enter()
        .append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(d => d.label);

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        labels
            .attr("x", d => d.x)
            .attr("y", d => d.y);

        updateButtonPosition(); // Обновляем позицию кнопки
    });

    // Заполняем datalist узлами
    const datalist = document.getElementById('node-options');
    nodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.label;
        datalist.appendChild(option);
    });

    // Обновление позиции кнопки
    function updateButtonPosition() {
        if (button && selectedNode) {
            const buttonX = selectedNode.x + 10; // Сдвинуть кнопку вправо от узла
            const buttonY = selectedNode.y - 30; // Сдвинуть кнопку вверх от узла

            button.attr("transform", `translate(${buttonX}, ${buttonY})`); // Обновляем позицию кнопки
        }
    }
    

    // Обработчик клика на узел
    function onNodeClick(event, clickedNode) {
        if (selectedNode === clickedNode) {
            // Если тот же узел, сбрасываем выделение
            resetGraph();
            selectedNode = null;
            button.remove(); // Удаляем кнопку
            button = null; // Сбрасываем ссылку на кнопку
        } else {
            resetGraph(); // Сбрасываем выделение узлов
            selectedNode = clickedNode; // Сохраняем выбранный узел

            // Удаляем предыдущие кнопки
            if (button) {
                button.remove();
            }

            // Создаем группу для кнопки
            button = container.append("g")
              .attr("class", "navigate-button");

            // Добавляем прямоугольник для фона кнопки
            button.append("rect")
              .attr("width", 220)  // Начальная ширина, можно изменить при необходимости
              .attr("height", 60)  // Высота кнопки, учитывая возможный перенос
              
              .attr("fill", "lightblue")
              .attr("rx", 8)
              .attr("ry", 8);

            // Добавляем foreignObject для текста с переносом
            button.append("foreignObject")
              .attr("x", 10)  // Отступ внутри кнопки
              .attr("y", 10)
              .attr("width", 200)  // Ширина текста внутри кнопки для управления переносом
              .attr("height", 40)  // Высота текста внутри кнопки
              .append("xhtml:div")  // Используем HTML-тег div для стилизации
              .style("color", "#333")
              .style("font-size", "14px")
              .style("font-family", "Arial, sans-serif")
              .style("cursor", "pointer")
              .style("text-align", "center")
              .style("word-wrap", "break-word")  // Включаем перенос слов
              .text(`Перейти на страницу "${clickedNode.label}"`);
            

              button.on("click", () => {   
                // Кодируем id узла для передачи в URL
                const connections = getConnections(clickedNode.id).map(node => encodeURIComponent(node)).join(',');
                const url = new URL('admin_node.html', window.location.origin);
                url.searchParams.set('id', encodeURIComponent(clickedNode.id));  // Передаем ID узла
                url.searchParams.set('connections', connections);  // Передаем связи
                         
                // Переход на страницу
                window.location.href = url;
            });
            
            
            // Функция для получения связей узла
            function getConnections(nodeId) {
                return links.reduce((acc, link) => {
                    if (link.source.id === nodeId) {
                        acc.push(link.target.id);  // Если это исходящий узел, добавляем целевой узел
                    } else if (link.target.id === nodeId) {
                        acc.push(link.source.id);  // Если это входящий узел, добавляем исходный узел
                    }
                    return acc;
                }, []);
            }
            
            highlightConnectedNodes(clickedNode); // Подсветка связанных узлов
            updateButtonPosition(); // Устанавливаем позицию кнопки
        }
    }

    // Поиск и выделение узлов
    document.getElementById('search-input').addEventListener('input', function () {
        const searchText = this.value.toLowerCase();
        isSearchActive = searchText !== "";

        if (isSearchActive) {
            // Убираем выделение узлов перед поиском
            resetGraph(); // Сбрасываем выделение

            foundNodes = nodes.filter(node =>
                node.label.toLowerCase().startsWith(searchText)
            );

            if (foundNodes.length > 0) {
                currentNodeIndex = 0;
                document.getElementById('next-button').style.display = 'inline';
                node.attr('fill', d => (foundNodes.includes(d) ? 'red' : d.color));
                focusOnNode(foundNodes[currentNodeIndex]);

                // Удаляем кнопку, если активен поиск
                if (button) {
                    button.remove();
                    button = null;
                }
            } else {
                document.getElementById('next-button').style.display = 'none';
            }
        } else {
            document.getElementById('next-button').style.display = 'none';
            resetGraph();
        }
    });

    // Обработчик для кнопки "Next"
    document.getElementById('next-button').addEventListener('click', () => {
        if (foundNodes.length > 0) {
            currentNodeIndex = (currentNodeIndex + 1) % foundNodes.length;
            focusOnNode(foundNodes[currentNodeIndex]);
        }
    });

    // Функция для фокусировки и зумирования на узле
    function focusOnNode(targetNode) {
        const zoomLevel = 2;
        const x = targetNode.x;
        const y = targetNode.y;

        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity.translate(width / 3 - zoomLevel * x, height / 3 - zoomLevel * y).scale(zoomLevel)
        );
    }

    // Подсветка связанных узлов и связей
    function highlightConnectedNodes(targetNode) {
        const connectedLinks = links.filter(link =>
            link.source.id === targetNode.id || link.target.id === targetNode.id
        );

        link.attr('stroke', d =>
            d.source.id === targetNode.id || d.target.id === targetNode.id ? 'red' : '#999'
        ).attr('stroke-width', d =>
            d.source.id === targetNode.id || d.target.id === targetNode.id ? 3 : 2
        );

        node.attr('fill', d =>
            connectedLinks.some(link => link.source.id === d.id || link.target.id === d.id) ? 'orange' : d.color
        );

        d3.select(node.filter(d => d.id === targetNode.id).node()).attr('fill', 'red');
    }

    // Сброс всех узлов и связей
    function resetGraph() {
        nodes.forEach(node => node.highlighted = false);
        node.attr('fill', d => d.color);
        link.attr('stroke', '#999').attr('stroke-width', 2);
        selectedNode = null; // Сбрасываем выбранный узел
        if (button) {
            button.remove(); // Удаляем кнопку
            button = null; // Сбрасываем ссылку на кнопку
        }
    }

    // Функции для перетаскивания узлов
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
});