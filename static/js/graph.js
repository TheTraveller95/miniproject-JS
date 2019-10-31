queue()
    .defer(d3.csv, 'data/Salaries.csv') //(1st argument=file format we want to load(in this case .csv), 2nd argument=path of the file)
    .await(makeGraph) //1 argument= name of the function we want to call when the data has been downloaded

function makeGraph(error, salaryData) {   // 1st argument= error   2nd argument= variable that the data from the CSV file
                                          // will be passed into by queue.js
                                          //this function is our main function, the one who calls all the other functions in order to
                                          //display the graphs
    var ndx= crossfilter(salaryData);

    salaryData.forEach(function (d) {
        d.salary= parseInt(d.salary); //we need ot convert the text format of the salary of the CSV file into integer. Otherwise our show_average_salary()
                                    // function won't read the data
        d.yrs_service= parseInt(d["yrs.service"]); // same reason of the above one. In this case we wrap the yrs.service inside the brackets and quotes because the variable
                                                    //already has a dot inside the name, so using the dot notation as in the example above would cause some issue
    });

    show_gender_balance(ndx); // we passed the ndx in the show_gender_balance function (witch does not exist yet, we need to create it)
    show_discipline_selector(ndx);
    show_average_salary(ndx);
    show_rank_distribution(ndx);
    /*show_percent_that_are_professors(ndx) //after generalizing the function below, we now need to call this function once for the men and once for the women*/
    show_percent_that_are_professors(ndx, 'Female', '#percentage-of-women-professors');
    show_percent_that_are_professors(ndx, 'Male', '#percentage-of-men-professors');
    show_service_to_salary_correlation(ndx);

    dc.renderAll();
}

function show_discipline_selector(ndx){
    dim= ndx.dimension(dc.pluck('discipline'))
    group= dim.group()

    dc.selectMenu('#discipline-selector')
        .dimension(dim)
        .group(group);
}

function show_gender_balance(ndx){

    var dim= ndx.dimension(dc.pluck('sex'));
    var group= dim.group();

    dc.barChart('#gender-balance') //the dc.barChart tell the browser in which div the barChart needs to be located
        .width(400)
        .height(300)
        .margins({top:10, right:50, bottom:30, left:50})
        .dimension(dim) //we specify which is the dimension of the chart (in this case is the var we created before)
        .group(group) //we specify which is the group of the chart (in this case is the var we created before)
        .transitionDuration(500)
        .x(d3.scale.ordinal()) //in the x asis we will display which are male and wich female. This is why we use the "scale"
        .xUnits(dc.units.ordinal) // and in the y asis will be the count of how many of each of those there were
        .xAxisLabel('Gender') // this will be the label below our chart related to the x axis
        .yAxis().ticks(20);

}

function show_average_salary(ndx){

    var dim=ndx.dimension(dc.pluck('sex'));

    function add_item(p,v){     // "p" is an accumulator that keeps track of the total, the count and the average
                                // "v" represent each of the data we are adding or removeing

        p.count++ ;
        p.total += v.salary; // we increment our total by the salary of the data item we are looking at
        p.average = p.total / p.count;

        return p;

    }

    function remove_item(p,v){  // "p" is an accumulator that keeps track of the total, the count and the average
                                // "v" represent each of the data we are adding or removeing

        p.count--;

        if(p.count==0){ //we need to set the if..else because when the p.count =0 the p.average will be someting/0 = error
            p.total=0;
            p.average=0;
        } else {
            p.total -= v.salary; // we reduce the total by the amount of the salary
            p.average = p.total/p.count;
        }

        return p;

    }

    function initialise(){  //the initialise function create an initial value for "p" and it doesn't take any argouments

        return {count:0, total:0, average:0} // the initial value for "p" needs to be 0 in our case

    }

    var averageSalaryByGender= dim.group().reduce(add_item, remove_item, initialise); //this var use a custom reducer function

    dc.barChart('#average-salary')
        .width(400)
        .height(300)
        .margins({top:10, left:50, right:50, bottom:30})
        .dimension(dim)
        .group(averageSalaryByGender)
        .valueAccessor(function (d){
            return d.value.average.toFixed(2);
    })                      //because we used a custom reducer function we need to set the valueAccessor because the value that is being
                            //plotted here is the value created in the initalise() function of our custom reducer so our value actually
                            //has a count, total and average and we need to specify which one we need to return
        .transitionDuration(500)
        .x(d3.scale.ordinal()) //again as the data is divided between female and male we need the ordinal scale and not the cardinal
        .xUnits(dc.units.ordinal)
        .xAxisLabel('Gender')
        .elasticY(true)
        .yAxis().ticks(4);
}

function show_rank_distribution(ndx){
    var dim= ndx.dimension(dc.pluck('sex'));

    /*var profByGender= dim.group().reduce( //this custom reduce() is valid only for professors and not for the other categories

        function add_item(p,v){  //p is the accumulator that keeps track of the value and v is the individual items that are getting added

            p.total++;
            if(v.rank=='Prof'){ //we only increment match if the rank of the piece of data we are looking at is professor
                p.match++;
            }

            return p;

        },

        function remove_item(p,v){

            p.total--;
            if(v.rank=='Prof'){ //we only decrement match if the rank of the piece of data we are looking at is professor
                p.match--;
            }

            return p;
        },

        function initalise(){  //it takes no argument but it create the data structure that will be threaded through the calls to add_items and remove_items

            return {total:0, match:0}   //total = an accumulator or a count for the number of rows that we are dailing with
                                        //match = count of how many of those rows are professors

        }

    )  //we need to find what percentage of men are professors, assistant professor and associate professors and the same for women*/

    function rankByGender(dimension,rank){

        return dimension.group().reduce( // we return the same reduce function we worte before but this time we make it general

        function add_item(p,v){

            p.total++;
            if(v.rank==rank){ //we only increment match if the rank of the piece of data we are looking at is the rank we are looking at
                p.match++;
            }

            return p;

        },

        function remove_item(p,v){

            p.total--;
            if(v.rank==rank){
                p.match--;
            }

            return p;
        },

        function initalise(){

            return {total:0, match:0}

        })

    }

    var profByGender= rankByGender(dim, "Prof") //as for the other cathegories the code would be the same, insted of duplicate it, we create a function rankByGender()
                                                //that can be called in the 3 cases just changing the   - dimension (that is always the same)
                                                //                                                      - rank (Prof, AsstProf, AssocProf)
    var asstProfByGender= rankByGender(dim, "AsstProf")
    var assocProfByGender= rankByGender(dim, "AssocProf")

    dc.barChart("#rank-distribution")
        .width(400)
        .height(300)
        .dimension(dim)
        .group(profByGender, "Prof")
        .stack(asstProfByGender, "Asst Prof")
        .stack(assocProfByGender, "Assoc Prof")
        .valueAccessor(function(d){
            if(d.value.total>0){  //the total part of the data structure, our value, is the total number of men or women that we have been found
                return (d.value.match / d.value.total) * 100;  //the match is the number of those that are professor, assistant professor, etc. So for each value that we are plotting we need to
                            //find what part of the total is the match
            } else {
                return 0;
            }
        })
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({top:10, right:100, bottom:30, left:30})
}

/*function show_percent_that_are_professors(ndx){ //for the moment we focalise on the percentage of the female being professors

    var percentageFemaleThatAreProf= ndx.groupAll().reduce(

        function add_items(p,v){

            if(v.sex=="Female"){
                p.count++;
                if(v.rank == "Prof"){
                    p.are_prof++;
                }
            }

            return p;

        },

        function remove_items(p,v){

            if(v.sex=="Female"){
                    p.count--;
                    if(v.rank == "Prof"){
                        p.are_prof--;
                    }
                }

                return p;

        },

        function initalise(){

            return ({count:0, are_prof:0})    // the data structure of our initialise() returns will consist of a count of the total number of record we encoutered and a second argumnent
                // telling us how many of these are prof

        }

    )
}*/

function show_percent_that_are_professors(ndx, gender, element){ //now we generalize the function adding "gender" and "element" as argouments of the function

    var percentageThatAreProf= ndx.groupAll().reduce(

        function add_items(p,v){

            if(v.sex==gender){
                p.count++;
                if(v.rank == "Prof"){
                    p.are_prof++;
                }
            }

            return p;

        },

        function remove_items(p,v){

            if(v.sex==gender){
                    p.count--;
                    if(v.rank == "Prof"){
                        p.are_prof--;
                    }
                }

                return p;

        },

        function initalise(){

            return {count:0, are_prof:0};    // the data structure of our initialise() returns will consist of a count of the total number of record we encoutered and a second argumnent
                // telling us how many of these are prof

        }

    );

    dc.numberDisplay(element) //we replaced the Div ID with the element where we want the number displayed
        .formatNumber(d3.format('.2%')) //we want to display the number with 2 decimals
        .valueAccessor(function(d){
            if(d.count==0){
                return 0;
            } else {
                return (d.are_prof/d.count);
            }
        }) //we need to use the value accessor because we used the custom reduce() so our values have a count part and an are_prof part right now
        .group(percentageThatAreProf);

};

function show_service_to_salary_correlation(ndx){

    var genderColors = d3.scale.ordinal()
        .domain(['Female', 'Male'])
        .range(['pink', 'blue']) //female=pink and male=blue

    var eDim= ndx.dimension(dc.pluck('yrs_service')); // the first dimension is going to be on years of service and we only use this to work on the bounds of the x-axis
                                                    // the minimum and the maximum year of service that we need to plot

    var experienceDim= ndx.dimension(function(d){  //the second dimension return an array with 2 parts: years of service and salary and this will allow us to plot the dots of the scatter plot at the right x and y coordinates
        return [d.yrs_service, d.salary, d.rank, d.sex] //the function returns years of service (used to plot the x cordinates of the dots) and salary (used to plot the y cordinates of the dots)
    }); //we also added d.sex in order to make the color method (that is based on Female and Men) work. And then we added rank just because the teacher wants to :)

    var experienceSalaryGroup= experienceDim.group();
    var minEperience = eDim.bottom(1)[0].yrs_service;
    var maxEperience= eDim.top(1)[0].yrs_service;

    dc.scatterPlot('#service-salary')
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minEperience, maxEperience])) //in this case we use linear and not ordinal because 5 years of service are more then 4, so we need our data to be ordinated
                                                                    // and the domain go from the minimum experiencce to the maximum experience
        .brushOn(false)
        .symbolSize(8) //size of the dots
        .clipPadding(10) //leaves room near the top so that if we have a plot that is right on the top there is actually room for it
        .xAxisLabel("Years of service")
        .yAxisLabel("Salary")
        .title(function(d){ //what appear if you hover the mouse over a dot
            return d.key[2] + "Earned" + d.key[1]; //the key[1] (that means salary) is related to the experienceDim. The salary is the 2nd item, this is why we put key[1](because they start from 0)
        })
        .colorAccessor(function(d){
            return d.key[3]; //the key[3] (that means sex) is related to the experienceDim. The sex is the 4th item, this is why we put key[3](because they start from 0)
        }) //this decides wich piece of data we use as an input into our genderColor scale
        .colors(genderColors)
        .dimension(experienceDim)
        .group(experienceSalaryGroup)
        .margins({top:10  ,right: 50 , bottom: 75 , left:75});


}