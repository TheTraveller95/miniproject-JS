queue()
    .defer(d3.csv, 'data/Salaries.csv') //(1st argument=file format we want to load(in this case .csv), 2nd argument=path of the file)
    .await(makeGraph) //1 argument= name of the function we want to call when the data has been downloaded

function makeGraph(error, salaryData) {   // 1st argument= error   2nd argument= variable that the data from the CSV file
                                          // will be passed into by queue.js
                                          //this function is our main function, the one who calls all the other functions in order to
                                          //display the graphs
    var ndx= crossfilter(salaryData);

    salaryData.forEach(function (d) {
        d.salary= parseInt(d.salary) //we need ot convert the text format of the salary of the CSV file into integer. Otherwise our show_average_salary()
                                    // function won't read the data
    });

    show_gender_balance(ndx); // we passed the ndx in the show_gender_balance function (witch does not exist yet, we need to create it)
    show_discipline_selector(ndx);
    show_average_salary(ndx);
    show_rank_distribution(ndx);
    show_percent_that_are_professors(ndx);

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

function show_percent_that_are_professors(ndx){

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

}