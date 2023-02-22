const fs = require("fs");
const readline = require('readline');
const cheerio = require("cheerio");
const csvWriter = require('csv-write-stream')
const puppeteer =require("puppeteer")
const axios = require('axios');

let writer = csvWriter({
    seperator : '|'
})



writer.pipe(fs.createWriteStream('data.csv'))

const getProducts = async (page) => {
    let $ = cheerio.load(page)
    return $("body > div.rectangle.dlp_subseries > div.content.flex > div.product_card > div.product_column > ul > li > div.product_name > a").attr('href')
}

const getProductDetails = async (links)=>{
    
        let productURL = links
        
        const productUrlPage = await fetch(productURL);
        let $ = cheerio.load(await productUrlPage.text())
        let productName = $("div.single-sku-hero-content > div.banner_container.font-black > div > div > div.banner_content_desc > div.desc_container > h2").text()

        console.log(productName)
        let manufacturerPartNumber = $("div.single-sku-hero-content > div.banner_container.font-black > div > div > div.banner_content_desc > div.desc_container > div.part-number").text().split(" ").at(-1)
        console.log(manufacturerPartNumber)
        
        let systemSpecs = []
        $("div.single-sku-hero-content > div.banner_container.font-black > div > div > div.banner_content_desc > div.system_specs_container > ul > li").map((i,li)=>{
            let key = $(li).children('div').text()
            let value = $(li).children('p').text()
            
            systemSpecs.push({key,value})    
        })
        

        console.log("sysSpecs")
        let images = []
        $(".swiper-slide").map((i,div)=>{
            
            let imageSrc = $(div).children('div').children('img').attr('src')
                images.push(imageSrc)    
        })

        console.log("images")

        

        let specifications = []
        let table = $("table.table:nth-child(1)")
        let keyProperty = ''
        table.find('tr').each((i,tr)=>{
           $(tr).find('td').each((i,td)=>{
                if(i == 0){
                    keyProperty = $(td).text()
                }else{
                        specifications.push({key : `${keyProperty}`,value : $(td).text()})
                }
           })
        })

        console.log("specs")
        

        let alternativeProducts = []
        for (let index = 0; index < 4; index++) {
            let sku = $(`div.col-md-3:nth-child(${index+1}) > div:nth-child(1) > h2:nth-child(3)`)
            alternativeProducts.push((sku.text()))
        }
        console.log("alt")

        async function start(){
            const browser =await puppeteer.launch({headless:true})
            const page =await browser.newPage()
            await page.goto(productURL)
            // const Description = await page.$eval(".feature-content-section",el => el.textContent);
            // console.log(Description)
            
             const names =await page.evaluate(()=>{
                let title=Array.from(document.querySelectorAll(".headlines")).map(x=> x.textContent)
                let description =Array.from(document.querySelectorAll(".description")).map(x=> x.textContent)
                let data = []
                for (let index = 0; index < title.length; index++) {
                    data.push({
                        title : title[index],
                        description : description[index]
            
                    })
                    
                }
                return data
            
             })

             console.log(names)
            //  await fs.writeFileSync("products.json",JSON.stringify(names))
            //  await fs.writeFileSync("Product.txt",Productnames.join("\r\n"))
            
             await browser.close()
             return names
        }
        let description = await start()
        
        writer.write({name: productName, manufacturerPartNumber,  images ,description : JSON.stringify(description), specifications : JSON.stringify(specifications) , alternativeProducts : JSON.stringify(alternativeProducts),url:links})

    }


const getNextPage = async (link, pageNumber) =>{
   
//    let page = await axios.get(link, {}, options);
    let page = await fetch(link);
    console.log("link",page)
    return await page.text();
}


(async ()=>{

    const categoriesURLs = fs.createReadStream('categoriesURLs.txt');
    const categoriesURLsInterface = readline.createInterface({
        input: categoriesURLs,
        crlfDelay: Infinity
    });
    for await (const categoryURL of categoriesURLsInterface) {
        if(categoryURL){
                let url = `https://www.lenovo.com/us/en/search?fq=&text=${categoryURL}&rows=20&sort=relevance`
                let page = await getNextPage(url)
                console.log("pogae")
                await getProductDetails(await getProducts(page))

            
        }
    }
})()
