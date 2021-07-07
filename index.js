const fs = require('fs');
const csv = require('csv-parser');

const args = process.argv.slice(2);
if (args.length < 1)
{
  console.error("Missing Required Input Target File");
  process.exit(-1);
}

const targetFile = args[0];
const outputFile = targetFile.replace(".csv", "") + "-DailySplit.csv";

const inputRows = [];
const collectDataRow = data => {
  try {
    inputRows.push(data);
  }
  catch(err) {
    console.error(err);
  }
};

// Date Formatting
const mmddyyyy = date => {
  const year = date.getFullYear();
  const month = (1 + date.getMonth()).toString();
  const day = date.getDate().toString().padStart(2, '0');

  return month + '/' + day + '/' + year;
};

// CSV Writer
const csvEnclosedVal = (val) => (typeof val == "string") ? '"' + val + '"' : val;
const csvRow = (vals) => vals.map(v => csvEnclosedVal(v)).join(",");
const toCsv = (data) => {
  if (!data || !data.length || data.length < 1)
    throw new Error('Invalid Argument - Cannot Convert To CSV');
  const csv = [];
  csv.push(csvRow(Object.keys(data[0])));
  for (let i = 0; i < data.length; i++)
    csv.push(csvRow(Object.values(data[i])));
  return csv.join("\r\n");
};

const getTransformedRows = dataRows => {
  const outputRows = [];
  dataRows
    .filter(i => i.Type != "Payout")
    .forEach(i => {
      if (i.Type == 'Reservation')
      {
        const numNights = i.Nights;
        const amount = i.Amount;
        const startDate = new Date(i['Start Date']);
        var currentDate = startDate;
        for(var d = 0; d < numNights; d++)
        {
          const newRow = { ...i, 
            'Cleaning Fee': d === 0 ? i['Cleaning Fee'] : '0', 
            'Host Fee': d === 0 ? i['Host Fee'] : '0',
            'Management fee': d === 0 ? i['Management fee'] : '0',
            revenueDay: mmddyyyy(currentDate), 
            amountPerDay: (amount/numNights).toFixed(2) 
          };
          outputRows.push(newRow);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      else
        outputRows.push(i);
    });
  return outputRows;
};

const saveCsv = (filename, outputRows) => {
  fs.writeFileSync(filename, toCsv(outputRows));
  console.log(`Successfully generated file: ${filename}`);
} 

fs.createReadStream(targetFile)
  .pipe(csv())
  .on('data', d => collectDataRow(d))
  .on('end', () => saveCsv(outputFile, getTransformedRows(inputRows)));
